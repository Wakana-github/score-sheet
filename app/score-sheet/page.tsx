// app/score-sheet/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import LoadingPage from "@/components/lodingPage";
import { useAuth, useUser  } from "@clerk/nextjs";
import PromoteSubscription from "@/components/promoteSubscription";


// API endpoint URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/scores";

// ScoreRecord interface. must be same as Mongoose Schema
interface ScoreRecord {
  id: string; // Unique ID generated on the application side (UUID)
  gameTitle: string;
  playerNames: string[];
  scoreItemNames: string[];
  scores: number[][]; // 2D array
  numPlayers: number;
  numScoreItems: number;
  createdAt: string; //ISO 8601 formatted string (e.g., "2023-10-27T10:00:00.000Z")
  lastSavedAt: string; // ISO 8601 formatted string
  userId: string;
}

// ScoreData state interface (for form management).
// It's almost identical to ScoreRecord, but 'scores' is string[][] to directly hold input values.
// This prevents conversion errors to number types even if input fields are empty.
interface ScoreData {
  id: string;
  gameTitle: string;
  playerNames: string[];
  scoreItemNames: string[];
  scores: string[][]; // Holds input field values directly as string[][]
  numPlayers: number;
  numScoreItems: number;
  createdAt: string;
  lastSavedAt: string;
  userId: string;
}

export default function ScoreSheetPage() {
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const recordIdFromUrl = searchParams.get("recordId"); // Record ID passed from the URL
  // logged in user from Clerk
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth();
  const { user } = useUser();
  
  // User subscription plan --- from Stripe
  const userPlan = user?.publicMetadata?.subscriptionStatus || "free";


  // Temporary interface for initialization (when loading from games.json)
  interface InitialGameData {
    id: number;
    title: string;
    column: number;
    row: number;
    score_items: string[];
  }

  // Manage scoreData as a single State object
  const [scoreData, setScoreData] = useState<ScoreData>({
    id: uuidv4(), // Generate UUID for new creation
    gameTitle: "",
    playerNames: Array(3)
      .fill("")
      .map((_, i) => `Player ${i + 1}`),
    scoreItemNames: Array(3)
      .fill("")
      .map((_, i) => `Round ${i + 1}`),
    scores: Array(3)
      .fill(0)
      .map(() => Array(3).fill("")), // Initial scores for 3 players x 3 items (initialized with empty strings)
    numPlayers: 3,
    numScoreItems: 3,
    createdAt: new Date().toISOString(),
    lastSavedAt: new Date().toISOString(),
    userId: userId || "", 
  });

  const [loading, setLoading] = useState(true);
  const [showTotal, setShowTotal] = useState(false);
  const [playerRanks, setPlayerRanks] = useState<number[]>([]);
 const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);

  // Calculate total scores (optimized with useMemo)
  const calculateTotalScores = useMemo(() => {
    const totals = Array(scoreData.numPlayers).fill(0);
    for (let i = 0; i < scoreData.numScoreItems; i++) {
      for (let j = 0; j < scoreData.numPlayers; j++) {
        // Treat empty strings as 0 and convert to numbers
        const score = parseInt(scoreData.scores[i]?.[j] || "0");
        if (!isNaN(score)) {
          totals[j] += score;
        }
      }
    }
    return totals;
  }, [scoreData.scores, scoreData.numPlayers, scoreData.numScoreItems]);

  // Calculate rankings (optimized with useCallback)
  const calculateRanks = useCallback(() => {
    const totals = calculateTotalScores; // Sort in descending order (higher score is higher rank)
    const playerTotalsWithIndex = totals.map((total, index) => ({
      playerIndex: index,
      total,
    }));

    playerTotalsWithIndex.sort((a, b) => b.total - a.total); // Sort in descending order (higher score is higher rank)

    const ranks = Array(scoreData.numPlayers).fill(0);
    let currentRank = 1;
    for (let i = 0; i < playerTotalsWithIndex.length; i++) {
      // The same scores will be the same ranking
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

  // useEffect for sheet initialization/loading
  useEffect(() => {
    async function initializeSheet() {
      setLoading(true);
       if (!isLoaded) {
                return;
            }

      if (recordIdFromUrl) {
        // Edit mode for existing record: Load from API
        try {
          //fetch token
           const token = await getToken({ template: "long_lasting" });
         
           const response = await fetch(`${API_BASE_URL}/${recordIdFromUrl}`,
            { headers: {"Authorization": `Bearer ${token}`,},});

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
            router.push("/records"); // Go back to record list on error
            return;
          }
          const recordToLoad: ScoreRecord = await response.json();

          // check if the user is the owner of a record
                    if (recordToLoad.userId !== userId) {
                         alert("You do not have permission to view this record.");
                         router.push("/records");
                         return;
                    }

          // Set loaded data to scoreData state
          setScoreData({
            id: recordToLoad.id,
            gameTitle: recordToLoad.gameTitle,
            playerNames: recordToLoad.playerNames,
            scoreItemNames: recordToLoad.scoreItemNames,
            scores: recordToLoad.scores.map((row) => row.map(String)), // Convert number array to string array
            numPlayers: recordToLoad.numPlayers,
            numScoreItems: recordToLoad.numScoreItems,
            createdAt: recordToLoad.createdAt,
            lastSavedAt: recordToLoad.lastSavedAt,
            userId: recordToLoad.userId,
          });
          setShowTotal(true); // Show total for existing records
        } catch (error) {
          console.error("Error loading record:", error);
          if (error instanceof Error) {
            alert(`Failed to load record: ${error.message}`);
          } else {
            alert("Failed to load record: An unknown error occurred.");
          }
          router.push("/records"); // Go back to record list on error
        } finally {
          setLoading(false);
        }
      } else {
        // Create New Sheet
        const gameId = searchParams.get("gameId");
        const customGameName = searchParams.get("name");
        const customRows = searchParams.get("rows");
        const customColumns = searchParams.get("columns");

        let initialGameTitle = "New Score Sheet";
        let initialNumPlayers = 3;
        let initialNumScoreItems = 3;
        let initialPlayerNames: string[] = Array(3)
          .fill("")
          .map((_, i) => `Player ${i + 1}`);
        let initialScoreItemNames: string[] = Array(3)
          .fill("")
          .map((_, i) => `Round ${i + 1}`);

        if (gameId) {
          try {
            const res = await fetch("/games.json"); // Load preset data from games.json
            if (!res.ok) throw new Error("Failed to fetch game data");
            const games: InitialGameData[] = await res.json();
            const selectedGame = games.find(
              (game) => game.id === Number(gameId)
            );

            if (selectedGame) {
              initialGameTitle = selectedGame.title;
              initialNumPlayers = selectedGame.column;
              initialNumScoreItems = selectedGame.row;
              initialPlayerNames = Array.from(
                { length: selectedGame.column },
                (_, i) => `Player ${i + 1}`
              );
              initialScoreItemNames = selectedGame.score_items;
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

          if (
            isNaN(parsedRows) ||
            isNaN(parsedColumns) ||
            parsedRows < 2 ||
            parsedColumns < 1
          ) {
            router.push("/custom-sheet");
            setLoading(false);
            return;
          }
          initialGameTitle = decodeURIComponent(customGameName);
          initialNumPlayers = parsedColumns;
          initialNumScoreItems = parsedRows - 1; // -1 (deduct total row) from the score items columns
          initialPlayerNames = Array.from(
            { length: parsedColumns },
            (_, i) => `Player ${i + 1}`
          );
          initialScoreItemNames = Array.from(
            { length: parsedRows - 1 },
            (_, i) => `Item ${i + 1}`
          );
        } else {
          // Redirect to custom sheet creation page if no parameters
          router.push("/custom-sheet");
          setLoading(false);
          return;
        }

        // Set initial State for new creation
        setScoreData({
          id: uuidv4(), // provide new UUID for new sheet
          gameTitle: initialGameTitle,
          playerNames: initialPlayerNames,
          scoreItemNames: initialScoreItemNames,
          scores: Array(initialNumScoreItems)
            .fill(0)
            .map(() => Array(initialNumPlayers).fill("")), // reset numbers
          numPlayers: initialNumPlayers,
          numScoreItems: initialNumScoreItems,
          createdAt: new Date().toISOString(),
          lastSavedAt: new Date().toISOString(),
           userId: userId || "",
        });
        setShowTotal(false); // hide total as default
        setLoading(false);
      }
    }
    initializeSheet();
  }, [isLoaded, recordIdFromUrl, searchParams, router, getToken, userId]);
  // reculculate ranking whrn scores and playerNames has changed
  useEffect(() => {
    if (showTotal && scoreData.numPlayers > 0 && scoreData.numScoreItems > 0) {
      calculateRanks();
    }
  }, [
    showTotal,
    scoreData.scores,
    scoreData.playerNames,
    scoreData.numPlayers,
    scoreData.numScoreItems,
    calculateRanks,
  ]);

  // change player name handler
  const handlePlayerNameChange = useCallback(
    (index: number, newName: string) => {
      setScoreData((prev) => {
        const updatedPlayerNames = [...prev.playerNames];
        updatedPlayerNames[index] = newName;
        return { ...prev, playerNames: updatedPlayerNames };
      });
    },
    []
  );

  // change score item handler
  const handleScoreItemNameChange = useCallback(
    (index: number, newName: string) => {
      setScoreData((prev) => {
        const updatedScoreItemNames = [...prev.scoreItemNames];
        updatedScoreItemNames[index] = newName;
        return { ...prev, scoreItemNames: updatedScoreItemNames };
      });
    },
    []
  );

  // score change handler
  const handleScoreChange = useCallback(
    (row: number, col: number, value: string) => {
      setScoreData((prev) => {
        const newScores = prev.scores.map((r) => [...r]);
        // create new row when new player's row doesn't exist
        if (!newScores[row]) {
          newScores[row] = Array(prev.numPlayers).fill("");
        }
        newScores[row][col] = value;
        return { ...prev, scores: newScores };
      });
    },
    []
  );

  // change number of player handler
  const handleNumPlayersChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newNum = parseInt(e.target.value);
      setScoreData((prev) => {
        const newPlayerNames = Array(newNum)
          .fill("")
          .map((_, i) => prev.playerNames[i] || `Player ${i + 1}`);
        const newScores = prev.scores.map((row) => {
          // change rows
          const newRow = Array(newNum)
            .fill("")
            .map((_, i) => row[i] || "");
          return newRow;
        });
        //reset ranking
        setPlayerRanks(Array(newNum).fill(0));
        return {
          ...prev,
          numPlayers: newNum,
          playerNames: newPlayerNames,
          scores: newScores,
        };
      });
    },
    []
  );

  // score change handler
  const handleNumScoreItemsChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newNum = parseInt(e.target.value);
      setScoreData((prev) => {
        const newScoreItemNames = Array(newNum)
          .fill("")
          .map((_, i) => prev.scoreItemNames[i] || `Round ${i + 1}`);
        const newScores = Array(newNum)
          .fill(null)
          .map((_, i) => {
            const existingRow = prev.scores[i] || []; // fetch existed score items, otherwise empty coulmns
            return Array(prev.numPlayers)
              .fill("")
              .map((_, j) => existingRow[j] || "");
          });
        return {
          ...prev,
          numScoreItems: newNum,
          scoreItemNames: newScoreItemNames,
          scores: newScores,
        };
      });
    },
    []
  );

  // Toggle total score
  const handleToggleTotal = useCallback(() => {
    setShowTotal((prev) => !prev);
    // calculate ranking showTotal cahge from false to true
    if (!showTotal) {
      calculateRanks();
    } else {
      setPlayerRanks(Array(scoreData.numPlayers).fill(0)); // reset ranking ehrn showTotal == False
    }
  }, [showTotal, calculateRanks, scoreData.numPlayers]);

  // Set Background colours depends on a score ranking
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

  // Save data handler to use API
  const handleSaveSheet = async () => {
    //Check if game name is set
    if (scoreData.gameTitle.trim() === "") {
      alert("Please enter a game title before saving.");
      return;
    }
    //check if user logged in
    if (!isSignedIn || !userId) {
  alert("Please sign in to save your score sheet.");
  return;
}

//Get token from Clerk
 const token = await getToken({ template: "long_lasting" });

    // change score data into number
    const scoresAsNumbers = scoreData.scores.map((row) =>
      row.map((s) => {
        const num = parseInt(s);
        return isNaN(num) ? 0 : num; // change empty or invalid letters to 0
      })
    );



    // create object to send
    const dataToSend: ScoreRecord = {
      ...scoreData,
      scores: scoresAsNumbers, // change scores to numeric
      lastSavedAt: new Date().toISOString(), // update last saving time
      // update createdAt only for new record (createdAt on existed record don't change)
      createdAt: recordIdFromUrl
        ? scoreData.createdAt
        : new Date().toISOString(),
         userId: userId
    };

    try {
      let response;

      //set autherisation header
      const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`, // token added
      };


      if (recordIdFromUrl) {
        // upload existed record (use PUT)
        response = await fetch(`${API_BASE_URL}/${recordIdFromUrl}`, {
          method: "PUT",
          headers: headers,
          body: JSON.stringify(dataToSend),
        });
      } else {
        // Create new record (use POST)
        response = await fetch(API_BASE_URL, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(dataToSend),
        });
      }

       if (response.status === 403) {
        const errorData = await response.json();
         if (errorData.isActiveUser) {
        // alert for active user
        alert(errorData.message);
      } else {
        // show subscription prompt page for free user
        setShowSubscriptionPrompt(true);
      }
      return;
    }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to save score: ${errorData.message || response.statusText}`
        );
      }

      const result: { message: string; record: ScoreRecord } =
        await response.json();
      alert(result.message);

      // When succeed、update recordId in FrontEnd (new record)
      // turn to update mode after saving new record
      if (!recordIdFromUrl) {
        // update record ID and createdAt, theb replace URL to new record ID
        router.replace(`/score-sheet?recordId=${result.record.id}`);
        setScoreData((prev) => ({
          ...prev,
          id: result.record.id,
          createdAt: result.record.createdAt,
        }));
      } else {
        // update lastSavedAt when saved existed record
        setScoreData((prev) => ({
          ...prev,
          lastSavedAt: result.record.lastSavedAt,
        }));
      }
    } catch (error) {
      console.error("Error saving score sheet:", error);
      if (error instanceof Error) {
        alert(`Failed to save score sheet: ${error.message}`);
      } else {
        alert("Failed to save score sheet: An unknown error occurred.");
      }
    }
  };

  // Loading Page
  if (loading) {
    return <LoadingPage />;
  }
// Toggle showSubscriptionPrompt depends on the status
  //  if (showSubscriptionPrompt) {
  //   return (<PromoteSubscription>{statsContent}</PromoteSubscription>);
  // }


  return (
    <main>
      <div className="flex flex-col items-center justify-start min-h-screen py-3 px-2 overflow-x-auto bg-cover bg-center bg-no-repeat">
        <div className="flex flex-wrap justify-center items-center w-full max-w-4xl px-2">
          {/* Game Title */}
          <h1 className="text-xl font-bold hand_font mb-2 w-full text-center">
            <input
              type="text"
              value={scoreData.gameTitle}
              onChange={(e) =>
                setScoreData((prev) => ({ ...prev, gameTitle: e.target.value }))
              }
              className="w-full text-center bg-transparent border-b-2 border-gray-400 focus:outline-none focus:border-blue-500 text-black font-bold text-2xl py-1 px-2"
              placeholder="Enter Game Title"
            />
          </h1>
          {/* munber of score items and players */}
          <div className="flex justify-end items-center text-lg hand_font text-gray-700 w-full mb-4">
            <label htmlFor="numScoreItems" className="mr-2 whitespace-nowrap">
              Score Items:
            </label>
            <select
              id="numScoreItems"
              value={scoreData.numScoreItems}
              onChange={handleNumScoreItemsChange}
              className="p-1 border border-gray-400 rounded-md bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(
                (num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                )
              )}
            </select>
            <label htmlFor="numPlayers" className="ml-4 mr-2 whitespace-nowrap">
              Players:
            </label>
            <select
              id="numPlayers"
              value={scoreData.numPlayers}
              onChange={handleNumPlayersChange}
              className="p-1 border border-gray-400 rounded-md bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500"
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto w-full max-w-4xl sm:max-w-3xl p-1 bg-transparent">
          <table className="min-w-full divide-y divide-gray-400 border border-gray-400 text-base text-white">
            <thead>
              <tr>
                {/* score items' header) */}
                <th className="table_green px-1 py-1 text-center text-base hand_font uppercase tracking-wider border-r border-gray-400 w-[80px] max-w-[100px] sticky left-0 z-20">
                  Score Items
                </th>
                {/* Player's header */}
                {scoreData.playerNames
                  .slice(0, scoreData.numPlayers)
                  .map((name, i) => (
                    <th
                      key={i}
                      className={`table_green px-1 py-1 hand_font border-r border-gray-400 text-center min-w-[70px] max-w-[80px] ${getRankBackgroundColor(
                        i
                      )}`}
                    >
                      <input
                        type="text"
                        value={name}
                        onChange={(e) =>
                          handlePlayerNameChange(i, e.target.value)
                        }
                        placeholder={`Player ${i + 1}`}
                        className="w-full bg-transparent border-b border-gray-400 focus:outline-none focus:border-gray-400 text-center text-base text-white"
                      />
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-400">
              {scoreData.scoreItemNames
                .slice(0, scoreData.numScoreItems)
                .map((itemName, rowIdx) => (
                  <tr key={rowIdx}>
                    {/* Score Items */}
                    <td className="px-1 py-1 border-r hand_font border-gray-400 w-24 text-center text-base text-black min-w-[80px] max-w-[100px] sticky left-0 z-10">
                      <input
                        type="text"
                        value={itemName}
                        onChange={(e) =>
                          handleScoreItemNameChange(rowIdx, e.target.value)
                        }
                        placeholder={`Item ${rowIdx + 1}`}
                        className="w-full bg-transparent border-b border-gray-400 focus:outline-none focus:border-gray-400 text-base text-black"
                      />
                    </td>
                    {/* Enter scores */}
                    {Array.from({ length: scoreData.numPlayers }).map(
                      (_, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-1 border-r hand_font border-gray-400 text-center text-black min-w-[60px] max-w-[80px]"
                        >
                          <input
                            type="number"
                            inputMode="numeric" // display numeric keyboad on Mobile
                            pattern="[0-9]*"
                            value={scoreData.scores[rowIdx]?.[colIdx] || ""} // safety check
                            onChange={(e) =>
                              handleScoreChange(rowIdx, colIdx, e.target.value)
                            }
                            className="w-full text-center text-lg font-bold bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-grey-100 text-black"
                            placeholder="0"
                          />
                        </td>
                      )
                    )}
                  </tr>
                ))}

              {/* 合計行 */}
              <tr className="text-xl font-bold hand_font text-white text-center table_green">
                <td className="px-2 py-1 border-r hand_font border-gray-400 sticky left-0 z-10">
                  Total
                </td>
                {calculateTotalScores
                  .slice(0, scoreData.numPlayers)
                  .map((total, i) => (
                    <td
                      key={`total-${i}`}
                      className={`px-1 py-0.5 border-r hand_font border-gray-400 text-center min-w-[60px] max-w-[80px] ${getRankBackgroundColor(
                        i
                      )}`}
                    >
                      {showTotal ? total : ""}
                    </td>
                  ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Buttons under the table */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-4xl mt-4">
          <div></div> {/* 左側の空グリッド */}
          {/* Total toggle button */}
          <div className="flex justify-center items-center">
            <button
              onClick={handleToggleTotal}
              className="py-1 px-5 rounded-lg hand_font text-lg bg-[#4A4A46] hover:bg-gray-400 text-white w-auto whitespace-nowrap"
            >
              {showTotal ? "Hide Total" : "Show Total"}
            </button>
          </div>
          {/*save button */}
          <div className="flex justify-center items-center">
            <button
              onClick={handleSaveSheet}
              className="py-1 px-6 text-lg rounded-full hand_font bg-red-800 hover:bg-red-700 text-white shadow-md"
            >
              Save
            </button>
          </div>
        </div>

        {/* go to My Records button */}
        <div className="mt-4">
          <button
            onClick={() => router.push("/records")}
            className="bg-gray-600 hover:bg-gray-700 hand_font text-white py-1 px-4 rounded-lg text-lg"
          >
            ← Go to My Records
          </button>
        </div>
        {/* Return to Home button */}
        <div className="self-start">
          <Link href="/" passHref>
            <button className="py-1 px-2 rounded-lg text-xl hand_font mt-2">
              ← Return to Home
            </button>
          </Link>
        </div>
      </div>
      {/* showSubscriptionPromptがtrueの場合のみPromoteSubscriptionを重ねて表示 */}
      {showSubscriptionPrompt && (
        <PromoteSubscription onClose={() => setShowSubscriptionPrompt(false)} />
      )}
    </main>
  );
}
