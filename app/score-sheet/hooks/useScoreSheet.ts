//useScoreSheet.ts

/* Custom Hook: useScoreSheet
 * This is the primary state management hook for the score sheet page.
 * It handles the core application logic, and data initialization (from saved records),
 * user input processing, score calculations, and saving data to the database.
 *
 * Key Responsibilities:
 *  Data Initialization:Loads data of saved record or initializes a new sheet based on 'gameId' or custom input
 * State Management: Manages the main score sheet data
 * Input Handling & Validation:Provides change handlers for scores, names, and title,
 * validation (regex checks) and composition handlers for IME input(Japanese keyboad) stability.
 * Score Calculation: Calculates real-time total scores and player ranks (`calculateTotalScores`, `calculateRanks`).
 * Handles saving (POST/PUT) the score sheet to the API
 * Group Integration:Pass group-related state and logic to `useGroupSelection` and manages the sheet's player count/names based on the selected group.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
  allowedTitleRegex,
  allowedNameRegex,
  allowedScoreRegex,
  MAX_SCORE_ITEMS,
  MAX_PLAYERS,
  MAX_TITLE_LENGTH,
  MAX_NAME_LENGTH,
} from "../../lib/constants.ts";
import { useAuth, useUser } from "@clerk/nextjs";
import he from "he";
import useGroupSelection from "./useGroupSelection.ts";
import {
  ScoreData,
  ScoreRecord,
  GroupData,
  InitialGameData,
  PlayerData,
} from "../score-types.ts";

// API endpoint URL for database operations
const API_BASE_URL = "/api/records";

const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

export default function useScoreSheet() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const recordIdFromUrl = searchParams.get("recordId");
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();

  const userPlan = user?.publicMetadata?.subscriptionStatus || "free";

  //import state from group selection
  const {
    availableGroups,
    selectedGroupId,
    selectedGroup,
    handleGroupSelect,
    initializeSelectedGroup,
    isGroupSelected,
    isLoadingGroups,
  } = useGroupSelection();

  const [scoreData, setScoreData] = useState<ScoreData>(() => {
    // fetch username, set null if it does not exist.
    const userNickname =
      user?.publicMetadata?.nickname &&
      typeof user.publicMetadata.nickname === "string"
        ? user.publicMetadata.nickname
        : null;

    // set first playername as nickname
    const initialPlayers: PlayerData[] = [
      { id: null, name: userNickname || "Player 1" }, // ID is initialized as null
      { id: null, name: "Player 2" },
      { id: null, name: "Player 3" },
    ];

    return {
      _id: uuidv4(),
      gameTitle: "",
      playerNames: initialPlayers,
      scoreItemNames: Array(3)
        .fill("")
        .map((_, i) => `Round ${i + 1}`),
      scores: Array.from({ length: 3 }, () => Array(3).fill("")),
      numPlayers: 3,
      numScoreItems: 3,
      createdAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
      userId: userId || "",
      custom: false,
      groupId: null,
    };
  });

  const [loading, setLoading] = useState(true);
  const [showTotal, setShowTotal] = useState(false);
  const [playerRanks, setPlayerRanks] = useState<number[]>([]);
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const originalNumScoreItems = useRef<number>(0);
  const originalNumPlayers = useRef<number>(0);
  const originalPlayerNames = useRef<string[]>([]);
  const composingRefs = useRef<{ [key: string]: boolean }>({});

  //Read token
  useEffect(() => {
    async function fetchCsrfToken() {
      try {
        const res = await fetch("/api/csrf-token", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch CSRF token");
        const data = await res.json();
        setCsrfToken(data.token); //srore token
      } catch (err) {
        console.error("Error fetching CSRF token:");
      }
    }
    if (isSignedIn) {
       fetchCsrfToken();
   }
  }, [isSignedIn]);

  //Ref for max scores to retain data.
  const allScores = useRef<string[][]>(
    Array(MAX_SCORE_ITEMS)
      .fill(0)
      .map(() => Array(MAX_PLAYERS).fill(""))
  );

  //Calculate total score
  const calculateTotalScores = useMemo(() => {
    const totals = Array(scoreData.numPlayers).fill(0);
    for (let i = 0; i < scoreData.numScoreItems; i++) {
      for (let j = 0; j < scoreData.numPlayers; j++) {
        const score = parseInt(scoreData.scores[i]?.[j] || "0");
        if (!isNaN(score)) {
          totals[j] += score;
        }
      }
    }
    return totals;
  }, [scoreData.scores, scoreData.numPlayers, scoreData.numScoreItems]);

  const calculateRanks = useCallback(() => {
    const totals = calculateTotalScores;
    const playerTotalsWithIndex = totals.map((total, index) => ({
      playerIndex: index,
      total,
    }));
    playerTotalsWithIndex.sort((a, b) => b.total - a.total);

    const ranks = Array(scoreData.numPlayers).fill(0);
    let currentRank = 1;
    for (let i = 0; i < playerTotalsWithIndex.length; i++) {
      if (
        i > 0 &&
        playerTotalsWithIndex[i].total < playerTotalsWithIndex[i - 1].total
      ) {
        currentRank = i + 1;
      }
      ranks[playerTotalsWithIndex[i].playerIndex] = currentRank;
    }
    setPlayerRanks(ranks);
  }, [scoreData.numPlayers, calculateTotalScores]);

  //Initialize sheet (Record Load or New Sheet Creation)
  useEffect(() => {
    async function initializeSheet() {
      setLoading(true);
      if (!isLoaded) {
        return;
      }

      //Loading record
      if (recordIdFromUrl) {
        try {
          let headers: HeadersInit = {};
          if (isSignedIn) {
            const token = await getToken({ template: "long_lasting" });
            headers = {
              Authorization: `Bearer ${token}`,
            };
          }
          const response = await fetch(`${API_BASE_URL}/${recordIdFromUrl}`, {
            headers, //pass headers
          });

          if (!response.ok) {
            if (response.status === 404) {
              alert("Record not found. It might have been deleted.");
            } else if (response.status === 401) {
              alert("You are not authorized to view this record.");
            } else {
              const errorData = await response.json();
              throw new Error(
                `HTTP error! status: ${response.status} - ${
                  errorData.message || "Unknown error"
                }`
              );
            }
            router.push("/records");
            return;
          }
          const recordToLoad: ScoreRecord = await response.json();

          if (recordToLoad.userId !== userId) {
            alert("You do not have permission to view this record.");
            router.push("/records");
            return;
          }

          const scoresAsString = recordToLoad.scores.map((row) =>
            row.map(String)
          );
          // Convert DB players to PlayerData[]
          const loadedPlayers: PlayerData[] = recordToLoad.playerNames.map(
            (member) => ({
              id: member.memberId,
              name: he.decode(member.name),
            })
          );
          const originalNames = loadedPlayers.map((p) => p.name);

          //copy all scores when it first loaded
          allScores.current = Array(MAX_SCORE_ITEMS)
            .fill(0)
            .map((_, i) =>
              Array(MAX_PLAYERS)
                .fill("")
                .map((_, j) => scoresAsString[i]?.[j] || "")
            );

          setScoreData({
            _id: recordToLoad._id,
            gameTitle: he.decode(recordToLoad.gameTitle),
            playerNames: loadedPlayers,
            scoreItemNames: recordToLoad.scoreItemNames.map((name) =>
              he.decode(name)
            ),
            scores: recordToLoad.scores.map((row) => row.map(String)),
            numPlayers: recordToLoad.numPlayers,
            numScoreItems: recordToLoad.numScoreItems,
            createdAt: recordToLoad.createdAt,
            lastSavedAt: recordToLoad.lastSavedAt,
            userId: recordToLoad.userId,
            custom: recordToLoad.custom,
            groupId: recordToLoad.groupId || null,
          });

          originalNumScoreItems.current = recordToLoad.numScoreItems;
          originalNumPlayers.current = recordToLoad.numPlayers;
          originalPlayerNames.current = originalNames;
          // initializeSelectedGroup(recordToLoad.groupId || null);
          setShowTotal(true);
        } catch (error) {
          console.error("Error loading record:", error);
          if (error instanceof Error) {
            alert(`Failed to load record: ${error.message}`);
          } else {
            alert("Failed to load record: An unknown error occurred.");
          }
          router.push("/records");
        } finally {
          setLoading(false);
        }
      } else {
        //set initial sheet
        const gameId = searchParams.get("gameId");
        const customGameName = searchParams.get("name");
        const customRows = searchParams.get("rows");
        const customColumns = searchParams.get("columns");

        //fetch user nickname\
        const userNickname =
          user?.publicMetadata?.nickname &&
          typeof user.publicMetadata.nickname === "string"
            ? user.publicMetadata.nickname
            : null;

        let initialGameTitle = "New Score Sheet";
        let initialNumPlayers = 3;
        let initialNumScoreItems = 3;
        let initialPlayers: PlayerData[] = Array(3)
          .fill(0)
          .map((_, i) => ({ id: null, name: `Player ${i + 1}` }));
        let initialScoreItemNames: string[] = Array(3)
          .fill("")
          .map((_, i) => `Round ${i + 1}`);
        let customSheet = false;

        if (gameId) {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
            const url = `${baseUrl}/games`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch game data");

            const games: InitialGameData[] = await res.json();
            const selectedGame = games.find(
              (game) => game.id === Number(gameId)
            );

            if (selectedGame) {
              initialGameTitle = selectedGame.title;
              initialNumPlayers = selectedGame.column;
              initialNumScoreItems = selectedGame.row;
              initialPlayers = Array.from(
                { length: selectedGame.column },
                (_, i) => {
                  const name =
                    i === 0 && userNickname ? userNickname : `Player ${i + 1}`;
                  return { id: null, name };
                }
              );
              initialScoreItemNames = selectedGame.score_items;
              customSheet = false;
            } else {
              console.error("Game not found.");
              router.push("/");
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error loading game data:", error);
            if (error instanceof Error) {
              alert(`Failed to load game data: ${error.message}`);
            } else {
              alert("Failed to load game data: An unknown error occurred.");
            }
            router.push("/");
            setLoading(false);
            return;
          }
        } else if (customRows && customColumns && customGameName) {
          const parsedRows = Number(customRows);
          const parsedColumns = Number(customColumns);
          customSheet = true;

          if (
            isNaN(parsedRows) ||
            isNaN(parsedColumns) ||
            parsedRows < 2 ||
            parsedRows > MAX_SCORE_ITEMS + 1 ||
            parsedColumns < 1 ||
            parsedColumns > MAX_PLAYERS
          ) {
            router.push("/custom-sheet");
            setLoading(false);
            return;
          }
          initialGameTitle = decodeURIComponent(customGameName);
          initialNumPlayers = parsedColumns;
          initialNumScoreItems = parsedRows - 1;
          initialPlayers = Array.from({ length: parsedColumns }, (_, i) => {
            const name =
              i === 0 && userNickname ? userNickname : `Player ${i + 1}`;
            return { id: null, name };
          });
          initialScoreItemNames = Array.from(
            { length: parsedRows - 1 },
            (_, i) => `Item ${i + 1}`
          );
          customSheet = true;
        } else {
          router.push("/custom-sheet");
          setLoading(false);
          return;
        }

        originalNumScoreItems.current = initialNumScoreItems;
        originalNumPlayers.current = initialNumPlayers;
        originalPlayerNames.current = initialPlayers.map((p) => p.name);

        // Initialize allScores ref for maximum size
        allScores.current = Array(MAX_SCORE_ITEMS)
          .fill(0)
          .map(() => Array(MAX_PLAYERS).fill(""));

        setScoreData({
          _id: uuidv4(),
          gameTitle: initialGameTitle,
          playerNames: initialPlayers,
          scoreItemNames: initialScoreItemNames,
          scores: Array(initialNumScoreItems)
            .fill(0)
            .map(() => Array(initialNumPlayers).fill("")),
          numPlayers: initialNumPlayers,
          numScoreItems: initialNumScoreItems,
          createdAt: new Date().toISOString(),
          lastSavedAt: new Date().toISOString(),
          userId: userId || "",
          custom: customSheet,
          groupId: null,
        });
        setShowTotal(false);
        setLoading(false);
      }
    }

    initializeSheet(); //render when isLoaded or recordIdFromUrl was changed
  }, [
    isLoaded,
    recordIdFromUrl,
    searchParams,
    router,
    getToken,
    userId,
    isSignedIn,
  ]);

  useEffect(() => {
    // Is ScoreSheet loading complete? Was a record loaded from URL?Is group list loading complete?
    if (!loading && recordIdFromUrl && !isLoadingGroups) {
      // scoreData.groupId is set in state by initializeSheet
      const loadedGroupId = scoreData.groupId;
      if (loadedGroupId) {
        // Execute initialization now that the group list is ready
        initializeSelectedGroup(loadedGroupId);
      }
    }
    //  Include timing-related state/props in the dependency array
  }, [
    loading,
    isLoadingGroups,
    recordIdFromUrl,
    scoreData.groupId,
    initializeSelectedGroup,
  ]);

  // When group is selected
  useEffect(() => {
    if (selectedGroup) {
      // Get names and IDs from member objects
      const membersArray = selectedGroup.members ?? [];
      const newPlayers: PlayerData[] = membersArray.map((member) => ({
        id: member.memberId,
        name: he.decode(member.name),
      }));
      const newNumPlayers = newPlayers.length;

      setScoreData((prev) => {
        prev.scores.forEach((row, i) => {
          row.forEach((score, j) => {
            // Save the score based on the current size (prev.numPlayers) to allScores.current
            if (i < MAX_SCORE_ITEMS && j < MAX_PLAYERS) {
              allScores.current[i][j] = score;
            }
          });
        });

        // set number of players with number of members
        const newScores = prev.scores.map((_, i) =>
          Array.from(
            { length: newNumPlayers },
            (_, colIdx) => allScores.current[i]?.[colIdx] || ""
          )
        );

        return {
          ...prev,
          numPlayers: newNumPlayers,
          playerNames: newPlayers,
          scores: newScores,
          groupId: selectedGroup._id,
        };
      });
      setPlayerRanks(Array(newNumPlayers).fill(0));
    } else if (scoreData.groupId) {
      // === Handle group reset===
      const originalNum = originalNumPlayers.current;
      const originalNames = originalPlayerNames.current;

      setScoreData((prev) => {
        // Revert scores back to the original number of players
        const scoresAfterGroupReset = prev.scores.map((_, i) =>
          Array.from(
            { length: originalNum },
            (_, colIdx) => allScores.current[i]?.[colIdx] || ""
          )
        );
        // Revert to the original number of players, apply original names, and reset ID to null
        const playersAfterGroupReset: PlayerData[] = Array.from(
          { length: originalNum },
          (_, i) => ({
            id: null,
            name: originalNames[i] || `Player ${i + 1}`, // Use the original name if available
          })
        );

        return {
          ...prev,
          groupId: null,
          numPlayers: originalNum,
          playerNames: playersAfterGroupReset,
          scores: scoresAfterGroupReset,
        };
      });
      setPlayerRanks(Array(originalNum).fill(0));
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (showTotal && scoreData.numPlayers > 0 && scoreData.numScoreItems > 0) {
      calculateRanks();
    }
  }, [
    showTotal,
    scoreData.scores,
    scoreData.numPlayers,
    scoreData.numScoreItems,
    calculateRanks,
  ]);

  const handleCompositionStart = (key: string) => {
    composingRefs.current[key] = true;
  };

  const handleCompositionEnd = useCallback(
    (
      key: string,
      value: string,
      handler: (value: string) => void,
      regex: RegExp,
      alertMessage: string
    ) => {
      composingRefs.current[key] = false;
      if (!regex.test(value)) {
        alert(alertMessage);
        return;
      }
      handler(value);
    },
    []
  );

  // Update Game Title in state
  const handleGameTitleChange = useCallback((newTitle: string) => {
    if (!allowedTitleRegex.test(newTitle)) {
      alert("Game titles can only contain allowed characters.");
      return;
    }
    const normalizedTitle = newTitle.trim().normalize("NFC"); // normalise
    const length = [...segmenter.segment(normalizedTitle)].length; // count per graphemeX
    if (length > MAX_TITLE_LENGTH) {
      alert(`Game title cannot exceed ${MAX_TITLE_LENGTH} characters.`);
      return;
    }

    setScoreData((prev) => ({ ...prev, gameTitle: newTitle }));
  }, []);

  // Update Player Name in state
  const handlePlayerNameChange = useCallback(
    (index: number, newName: string) => {
      if (isGroupSelected) {
        alert("Cannot change player names while a group is selected.");
        return;
      }
      if (!allowedNameRegex.test(newName)) {
        alert(
          "Player names can only contain letters, numbers, Japanese characters, and some emojis."
        );
        return;
      }
      const normalizedName = newName.trim().normalize("NFC");
      const length = [...segmenter.segment(normalizedName)].length;
      if (length > MAX_NAME_LENGTH) {
        alert(`Player name cannot exceed ${MAX_NAME_LENGTH} characters.`);
        return;
      }

      setScoreData((prev) => {
        const updatedPlayers = [...prev.playerNames];
        if (updatedPlayers[index]) {
          updatedPlayers[index] = { ...updatedPlayers[index], name: newName };
        }
        return { ...prev, playerNames: updatedPlayers };
      });
    },
    [isGroupSelected]
  );

  // Update Score Item Name in state
  const handleScoreItemNameChange = useCallback(
    (index: number, newName: string) => {
      if (!allowedNameRegex.test(newName)) {
        alert(
          "Score item names can only contain letters, numbers, Japanese characters, and some emojis."
        );
        return;
      }

      const normalizedName = newName.trim().normalize("NFC");
      const length = [...segmenter.segment(normalizedName)].length;

      if (length > MAX_NAME_LENGTH) {
        alert(`Score item name cannot exceed ${MAX_NAME_LENGTH} characters.`);
        return;
      }

      setScoreData((prev) => {
        const updatedScoreItemNames = [...prev.scoreItemNames];
        updatedScoreItemNames[index] = newName;
        const customSheet = true;

        return {
          ...prev,
          scoreItemNames: updatedScoreItemNames,
          custom: customSheet,
        };
      });
    },
    []
  );

  // Update a specific score cell
  const handleScoreChange = useCallback(
    (row: number, col: number, value: string) => {
      allScores.current[row][col] = value;

      // allow empty string
      if (value === "") {
        setScoreData((prev) => {
          const newScores = prev.scores.map((r) => [...r]);
          newScores[row][col] = "";
          return { ...prev, scores: newScores };
        });
        return;
      }

      // check invalid string (exept numbers and minus)
      if (!allowedScoreRegex.test(value)) {
        alert("Score can only contain numbers or a minus sign.");
        return;
      }

      // trim zero
      // e.g. "00123" -> "123", "-0045" -> "-45"
      let sanitizedValue = value;
      if (value.length > 1 && value.startsWith("0")) {
        sanitizedValue = value.replace(/^0+/, "");
      }
      if (value.length > 2 && value.startsWith("-0")) {
        sanitizedValue = value.replace(/^-0+/, "-");
      }

      // ② perse int and check the range of number
      const parsedValue = parseInt(sanitizedValue, 10);
      const MAX_SCORE_VALUE = 1000;
      const MIN_SCORE_VALUE = -1000;

      // allow "-""
      if (sanitizedValue === "-") {
        setScoreData((prev) => {
          const newScores = prev.scores.map((r) => [...r]);
          newScores[row][col] = sanitizedValue;
          return { ...prev, scores: newScores };
        });
        return;
      }

      if (isNaN(parsedValue)) {
        return;
      }

      if (parsedValue > MAX_SCORE_VALUE || parsedValue < MIN_SCORE_VALUE) {
        alert(
          `Score must be between ${MIN_SCORE_VALUE} and ${MAX_SCORE_VALUE}.`
        );
        return;
      }

      // update state only after pass all validations
      setScoreData((prev) => {
        const newScores = prev.scores.map((r) => [...r]);
        newScores[row][col] = sanitizedValue;

        return { ...prev, scores: newScores };
      });
    },
    []
  );

  // Handler for changing the number of players
  const handleNumPlayersChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      //Can't change while group is selected
      if (isGroupSelected) {
        alert("Cannot change the number of players while a group is selected.");
        return;
      }

      const newNum = parseInt(e.target.value);
      if (isNaN(newNum) || newNum < 1 || newNum > MAX_PLAYERS) {
        alert("invalid player numbers");
        return;
      }

      const newPlayers: PlayerData[] = Array.from(
        { length: newNum },
        (_, i) => {
          const existingPlayer = scoreData.playerNames[i];
          const name = existingPlayer ? existingPlayer.name : `Player ${i + 1}`;
          return { id: existingPlayer ? existingPlayer.id : null, name };
        }
      );

      originalNumPlayers.current = newNum;
      originalPlayerNames.current = newPlayers.map((p: PlayerData) => p.name);

      setScoreData((prev) => {
        const newScores = prev.scores.map((_, i) =>
          Array.from(
            { length: newNum },
            (_, j) => allScores.current[i]?.[j] || ""
          )
        );

        setPlayerRanks(Array(newNum).fill(0));
        return {
          ...prev,
          numPlayers: newNum,
          playerNames: newPlayers,
          scores: newScores,
        };
      });
    },
    [isGroupSelected, scoreData.playerNames]
  );

  // Handler for changing the number of score items
  const handleNumScoreItemsChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newNum = parseInt(e.target.value);
      if (isNaN(newNum) || newNum < 1 || newNum > MAX_SCORE_ITEMS) {
        alert("invalid score item numbers");
        return;
      }

      const newScoreItemNames = Array.from({ length: newNum }, (_, i) =>
        i < scoreData.scoreItemNames.length
          ? scoreData.scoreItemNames[i]
          : `Round ${i + 1}`
      );

      setScoreData((prev) => {
        const newScores = Array.from({ length: newNum }, (_, i) => {
          return Array.from(
            { length: prev.numPlayers },
            (_, j) => allScores.current[i]?.[j] || ""
          );
        });

        // Update custom status and title
        const isCustomNow = newNum !== originalNumScoreItems.current;
        const customSheet = prev.custom || isCustomNow;

        return {
          ...prev,
          numScoreItems: newNum,
          scoreItemNames: newScoreItemNames,
          scores: newScores,
          custom: customSheet,
        };
      });
    },
    [scoreData.scoreItemNames]
  );

  const handleToggleTotal = useCallback(() => {
    setShowTotal((prev) => !prev);
    if (!showTotal) {
      calculateRanks();
    } else {
      setPlayerRanks(Array(scoreData.numPlayers).fill(0));
    }
  }, [showTotal, calculateRanks, scoreData.numPlayers]);

  const getRankBackgroundColor = (playerIndex: number) => {
    if (!showTotal || playerRanks.length === 0) return "";
    const rank = playerRanks[playerIndex];
    switch (rank) {
      case 1:
        return "first-color";
      case 2:
        return "second-color";
      case 3:
        return "third-color";
      default:
        return "";
    }
  };

  const handleSaveSheet = async () => {
    // Basic validation before saving
    if (scoreData.gameTitle.trim() === "") {
      alert("Please enter a game title before saving.");
      return;
    }
    if (!isSignedIn || !userId) {
      alert("Please sign in to save your score sheet.");
      return;
    }
    //Check csrfToken
    if (!csrfToken) {
      alert(
        "Security error: CSRF token is not available. Please wait or refresh the page."
      );
      return;
    }

    const {
      _id,
      gameTitle,
      playerNames,
      scoreItemNames,
      scores,
      numPlayers,
      numScoreItems,
      groupId,
    } = scoreData;

    // validation for gametitle
    if (!allowedTitleRegex.test(scoreData.gameTitle)) {
      alert("Game titles can only contain allowed characters.");
      return;
    }

    // validation for player name and score items
    const allNames = [
      ...scoreData.playerNames.map((p) => p.name),
      ...scoreData.scoreItemNames,
    ];
    if (!allNames.every((name) => allowedNameRegex.test(name))) {
      alert("Player and item Names can only contain allowed characters.");
      return;
    }

    const playerTotals: number[] = Array(scoreData.numPlayers).fill(0);
    scoreData.scores.forEach((row) => {
      row.forEach((score, playerIndex) => {
        playerTotals[playerIndex] += parseInt(score, 10) || 0;
      });
    });

    // check range of numbers
    const MAX_TOTAL = 10000;
    const MIN_TOTAL = -10000;

    const isTotalScoreValid = playerTotals.every(
      (total) => total <= MAX_TOTAL && total >= MIN_TOTAL
    );
    if (!isTotalScoreValid) {
      alert(
        `Total score for each player must be between ${MIN_TOTAL} and ${MAX_TOTAL}.`
      );
      return;
    }

    const scoresAsNumbers = scores.map((row) =>
      row.map((val) => parseInt(val) || 0)
    );

    const playersToSave = playerNames.map((p, index) => {
      //Add player X when player name is empty
      const nameToSave = p.name.trim() === "" ? `Player${index + 1}` : p.name;

      return {
        memberId: p.id === null || p.id === "" ? undefined : p.id,
        name: nameToSave,
      };
    });

    const dataToSave = {
      gameTitle: gameTitle,
      playerNames: playersToSave,
      scoreItemNames: scoreItemNames,
      scores: scoresAsNumbers,
      lastSavedAt: new Date().toISOString(),
      userId: userId,
      numPlayers,
      numScoreItems,
      custom: scoreData.custom,
      groupId: groupId || null,
    };

    try {
      //Fetch clerk token
      const token = await getToken({ template: "long_lasting" });
      const method = recordIdFromUrl ? "PUT" : "POST";
      const url = recordIdFromUrl
        ? `${API_BASE_URL}/${recordIdFromUrl}`
        : API_BASE_URL;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(dataToSave),
      });

      if (response.status === 403) {
        const errorData = await response.json();
        if (errorData.isActiveUser) {
          alert(errorData.message);
        } else {
          setShowSubscriptionPrompt(true);
        }
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          errorData.message || `HTTP error! status: ${response.status}`;
        const field = errorData.field || "unknown field";
        throw new Error(`${errorMessage} on field: ${field}`);
      }

      const responseData = await response.json();
      const savedRecord = responseData.record;
      // check if savedRecord is not undefined
      if (!savedRecord || !savedRecord._id) {
        throw new Error("Failed to retrieve record ID from server response.");
      }

      const newRecordId = savedRecord._id;

      alert("Score sheet saved successfully!");

      if (!recordIdFromUrl) {
        router.push(`/score-sheet?recordId=${newRecordId}`);
      }
    } catch (error) {
      console.error("Error saving score sheet:", error);
      alert(
        `Failed to save score sheet. ${
          error instanceof Error ? error.message : "An unknown error occurred."
        }`
      );
    }
  };

  return {
    scoreData,
    loading,
    showTotal,
    playerRanks,
    showSubscriptionPrompt,
    setShowSubscriptionPrompt,
    calculateTotalScores,
    handleNumPlayersChange,
    handleNumScoreItemsChange,
    handleSaveSheet,
    handleToggleTotal,
    handleCompositionStart,
    handleCompositionEnd,
    handlePlayerNameChange,
    handleGameTitleChange,
    handleScoreItemNameChange,
    handleScoreChange,
    getRankBackgroundColor,
    allowedTitleRegex,
    allowedNameRegex,
    allowedScoreRegex,
    composingRefs,
    groupOptions: availableGroups,
    selectedGroupId,
    handleGroupSelect,
    isGroupSelected,
  };
}
