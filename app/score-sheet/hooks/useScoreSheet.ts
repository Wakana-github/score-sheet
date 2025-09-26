//useScoreSheet.ts

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { allowedTitleRegex, allowedNameRegex, allowedScoreRegex, MAX_SCORE_ITEMS, MAX_PLAYERS, MAX_TITLE_LENGTH, MAX_NAME_LENGTH } from '../../lib/constants.ts'; 
import { useAuth, useUser } from "@clerk/nextjs";
import he from 'he';
import useGroupSelection from './useGroupSelection.ts';
import { ScoreData, ScoreRecord, GroupData, InitialGameData } from '../score-types.ts';


// API endpoint URL for database operations
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/scores";


const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });

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
    isGroupSelected,
  } = useGroupSelection();


  const [scoreData, setScoreData] = useState<ScoreData>(() => {
  // fetch username, set null if it does not exist.
  const userNickname = (user?.publicMetadata?.nickname && typeof user.publicMetadata.nickname === 'string')
    ? user.publicMetadata.nickname
    : null;

  // set first playername as nickname
  const initialPlayerNames = [
    userNickname || "Player 1",
    ...Array(2).fill("").map((_, i) => `Player ${i + 2}`)
  ];
    return {
    _id: uuidv4(),
    gameTitle: "",
    playerNames: initialPlayerNames,
    scoreItemNames: Array(3).fill("").map((_, i) => `Round ${i + 1}`),
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

  const originalNumScoreItems = useRef<number>(0);
  const originalNumPlayers = useRef<number>(0);
  const originalPlayerNames = useRef<string[]>([]); 
  const composingRefs = useRef<{ [key: string]: boolean }>({});

  //Ref for max scores to retain data.
  const allScores = useRef<string[][]>(Array(MAX_SCORE_ITEMS).fill(0).map(() => Array(MAX_PLAYERS).fill("")));
  

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

  useEffect(() => {
    async function initializeSheet() {
      setLoading(true);
      if (!isLoaded) {
        return;
      }

      if (recordIdFromUrl) {
        try {
          const token = await getToken({ template: "long_lasting" });
          const response = await fetch(`${API_BASE_URL}/${recordIdFromUrl}`, {
            headers: { Authorization: `Bearer ${token}` },
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

          const scoresAsString = recordToLoad.scores.map((row) => row.map(String));

          //copy all scores when it first loaded
          allScores.current = Array(MAX_SCORE_ITEMS).fill(0).map((_, i) => 
              Array(MAX_PLAYERS).fill("").map((_, j) => scoresAsString[i]?.[j] || "")
          );

          setScoreData({
            _id: recordToLoad._id,
            gameTitle: he.decode(recordToLoad.gameTitle),
            playerNames: recordToLoad.playerNames.map(name => he.decode(name)),
            scoreItemNames: recordToLoad.scoreItemNames.map(name => he.decode(name)),
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
          originalPlayerNames.current = recordToLoad.playerNames.map(name => he.decode(name));
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
        const userNickname = (user?.publicMetadata?.nickname && typeof user.publicMetadata.nickname === 'string')
        ? user.publicMetadata.nickname
        : null;

        let initialGameTitle = "New Score Sheet";
        let initialNumPlayers = 3;
        let initialNumScoreItems = 3;
        let initialPlayerNames: string[] = Array(3).fill("").map((_, i) => `Player ${i + 1}`);
        let initialScoreItemNames: string[] = Array(3).fill("").map((_, i) => `Round ${i + 1}`);
        let customSheet = false;

        if (gameId) {
          try {
            const res = await fetch("/games.json");
            if (!res.ok) throw new Error("Failed to fetch game data");
            const games: InitialGameData[] = await res.json();
            const selectedGame = games.find((game) => game.id === Number(gameId));

            if (selectedGame) {
              initialGameTitle = selectedGame.title;
              initialNumPlayers = selectedGame.column;
              initialNumScoreItems = selectedGame.row;
              initialPlayerNames = Array.from({ length: selectedGame.column }, (_, i) => {
              if (i === 0 && userNickname) {
                return userNickname;
              }
              return `Player ${i + 1}`;
            });
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
          initialPlayerNames = Array.from({ length: parsedColumns }, (_, i) => {
          if (i === 0 && userNickname) {
            return userNickname;
          }
          return `Player ${i + 1}`;
        });
          initialScoreItemNames = Array.from({ length: parsedRows - 1 }, (_, i) => `Item ${i + 1}`);
          customSheet = true; 
        } else {
          router.push("/custom-sheet");
          setLoading(false);
          return;
        }

        originalNumScoreItems.current = initialNumScoreItems; 
        originalNumPlayers.current = initialNumPlayers;
        originalPlayerNames.current = initialPlayerNames;

        //allScores
        allScores.current = Array(MAX_SCORE_ITEMS).fill(0).map(() => Array(MAX_PLAYERS).fill(""));


        setScoreData({
          _id: uuidv4(),
          gameTitle: initialGameTitle,
          playerNames: initialPlayerNames,
          scoreItemNames: initialScoreItemNames,
         scores: Array(initialNumScoreItems).fill(0).map(() => Array(initialNumPlayers).fill("")),
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
    initializeSheet();
  }, [isLoaded, recordIdFromUrl, searchParams, router, getToken, userId]);

 // When group is selected
  useEffect(() => {
    if (selectedGroup) {
        const newNumPlayers = selectedGroup.members.length;
        const newPlayerNames = selectedGroup.members.map(name => he.decode(name));

        setScoreData(prev => {
            // set number of players with number of members
            const newScores = prev.scores.map((_, i) =>
                Array.from({ length: newNumPlayers }, (_, colIdx) => allScores.current[i]?.[colIdx] || "")
            );


            return {
                ...prev,
                numPlayers: newNumPlayers,
                playerNames: newPlayerNames,
                scores: newScores,
                groupId: selectedGroup._id,
            };
        });
        setPlayerRanks(Array(newNumPlayers).fill(0));
    } else if (scoreData.groupId) { 
      // === グループが解除された場合 (groupIdが残っている場合) ===
      const originalNum = originalNumPlayers.current;
      const originalNames = originalPlayerNames.current;

      setScoreData(prev => {
        // スコアを元の人数に戻す
       const scoresAfterGroupReset = prev.scores.map((_, i) =>
          Array.from({ length: originalNum }, (_, colIdx) => allScores.current[i]?.[colIdx] || "")
        );

        return { 
          ...prev, 
          groupId: null,
          numPlayers: originalNum,
          playerNames: originalNames,
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
  }, [showTotal, scoreData.scores, scoreData.playerNames, scoreData.numPlayers, scoreData.numScoreItems, calculateRanks]);

  const handleCompositionStart = (key: string) => {
    composingRefs.current[key] = true;
  };

  const handleCompositionEnd = useCallback(
    (key: string, value: string, handler: (value: string) => void, regex: RegExp, alertMessage: string) => {
    composingRefs.current[key] = false;
    if (!regex.test(value)) {
      alert(alertMessage);
      return;
    }
    handler(value);
  }, []);

  // Update Game Title in state
  const handleGameTitleChange = useCallback((newTitle: string) => {
     if (!allowedTitleRegex.test(newTitle)) {
          alert("Game titles can only contain allowed characters.");
      return;
  }
const normalizedTitle = newTitle.trim().normalize('NFC'); // normalise
  const length = [...segmenter.segment(normalizedTitle)].length; // count per grapheme

  if (length > MAX_TITLE_LENGTH) {
    alert(`Game title cannot exceed ${MAX_TITLE_LENGTH} characters.`);
    return;
  }

    setScoreData((prev) => ({ ...prev, gameTitle: newTitle }));
  }, []);

  // Update Player Name in state
  const handlePlayerNameChange = useCallback((index: number, newName: string) => {

     if (isGroupSelected) {
        alert("Cannot change player names while a group is selected.");
        return;
    }

     if (!allowedNameRegex.test(newName)) {
      alert("Player names can only contain letters, numbers, Japanese characters, and some emojis.");
      return;
  }

    const normalizedName = newName.trim().normalize('NFC');
    const length = [...segmenter.segment(normalizedName)].length;

    if (length > MAX_NAME_LENGTH) {
      alert(`Player name cannot exceed ${MAX_NAME_LENGTH} characters.`);
      return;
    }

    setScoreData((prev) => {
      const updatedPlayerNames = [...prev.playerNames];
      updatedPlayerNames[index] = newName;
      return { ...prev, playerNames: updatedPlayerNames };
    });
  }, [isGroupSelected]);

  // Update Score Item Name in state
  const handleScoreItemNameChange = useCallback((index: number, newName: string) => {
    if (!allowedNameRegex.test(newName)) {
      alert("Score item names can only contain letters, numbers, Japanese characters, and some emojis.");
      return;
  }

    const normalizedName = newName.trim().normalize('NFC');
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
        custom:customSheet,
       };
    });
  }, [scoreData]);

  
  // Update a specific score cell
  const handleScoreChange = useCallback((row: number, col: number, value: string) => {

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
  
  // ① check invalid string (exept numbers and minus)
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
    alert(`Score must be between ${MIN_SCORE_VALUE} and ${MAX_SCORE_VALUE}.`);
    return;
  }
  
  // update state only after pass all validations
  setScoreData((prev) => {
    const newScores = prev.scores.map((r) => [...r]);
     newScores[row][col] = sanitizedValue;

    return { ...prev, scores: newScores };
  });
}, []);




  // Handler for changing the number of players
  const handleNumPlayersChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    
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

    setScoreData((prev) => {
      const newPlayerNames = Array.from({ length: newNum }, (_, i) =>
        i < prev.playerNames.length ? prev.playerNames[i] : `Player ${i + 1}`
      );
      const newScores = prev.scores.map((_, i) =>
        Array.from({ length: newNum }, (_, j) => allScores.current[i]?.[j] || "")
      );

      setPlayerRanks(Array(newNum).fill(0));
      return {
        ...prev,
        numPlayers: newNum,
        playerNames: newPlayerNames,
        scores: newScores,
      };
    });

    originalNumPlayers.current = newNum;
    originalPlayerNames.current = Array.from({ length: newNum }, (_, i) =>
        i < scoreData.playerNames.length ? scoreData.playerNames[i] : `Player ${i + 1}`
    );
  }, [isGroupSelected, scoreData.playerNames]);

  // Handler for changing the number of score items
  const handleNumScoreItemsChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newNum = parseInt(e.target.value);
    if (isNaN(newNum) || newNum < 1 || newNum > MAX_SCORE_ITEMS) {
      alert("invalid score item numbers");
      return;
    }

    setScoreData((prev) => {
      const newScoreItemNames = Array.from({ length: newNum }, (_, i) =>
 i < prev.scoreItemNames.length ? prev.scoreItemNames[i] : `Round ${i + 1}`
 );
      const newScores = Array.from({ length: newNum }, (_, i) => {
      return Array.from({ length: prev.numPlayers }, (_, j) => allScores.current[i]?.[j] || "");
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
  }, []);

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
  const allNames = [...scoreData.playerNames, ...scoreData.scoreItemNames];
  if (!allNames.every(name => allowedNameRegex.test(name))) {
      alert("Player and item Names can only contain allowed characters.");
      return;
  }


    const playerTotals: number[] = Array(scoreData.numPlayers).fill(0);
  scoreData.scores.forEach(row => {
    row.forEach((score, playerIndex) => {
      playerTotals[playerIndex] += parseInt(score, 10) || 0;
    });
  });

  // check range of numbers
  const MAX_TOTAL = 10000;
  const MIN_TOTAL = -10000;

  const isTotalScoreValid = playerTotals.every(total => total <= MAX_TOTAL && total >= MIN_TOTAL);
if (!isTotalScoreValid) {
    alert(`Total score for each player must be between ${MIN_TOTAL} and ${MAX_TOTAL}.`);
    return; 
  }

   const scoresAsNumbers = scores.map(row => row.map(val => parseInt(val) || 0));

 
   const dataToSave = {
  id: _id,
  gameTitle: gameTitle,
  playerNames: playerNames,
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
      const token = await getToken({ template: "long_lasting" });
      const method = recordIdFromUrl ? "PUT" : "POST";
      const url = recordIdFromUrl ? `${API_BASE_URL}/${recordIdFromUrl}` : API_BASE_URL;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
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
        const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
        const field = errorData.field || 'unknown field';
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
      alert(`Failed to save score sheet. ${error instanceof Error ? error.message : "An unknown error occurred."}`);
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