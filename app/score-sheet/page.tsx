"use client";

import React, { useState, useEffect, useCallback } from "react"; // useCallback をインポート
import { useSearchParams, useRouter } from "next/navigation";

// game data
interface GameData {
  id: number;
  title: string;
  column: number;
  row: number;
  notes: string;
  score_items: string[];
}

interface ScoreRecord {
  id: string; // unique ID
  gameTitle: string;
  playerNames: string[];
  scoreItemNames: string[];
  scores: number[][];
  numPlayers: number;
  numScoreItems: number;
  createdAt: string; // times created
  lastSavedAt: string;
}

// Maximum record number for FREE version
const MAX_FREE_RECORDS = 3;

export default function ScoreSheetPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const gameId = searchParams.get("gameId");
  const customGameName = searchParams.get("name");
  const customRows = searchParams.get("rows");
  const customColumns = searchParams.get("columns");

  const recordId = searchParams.get('recordId'); // use for loading record

  const [gameTitle, setGameTitle] = useState("Score Sheet");
  const [numPlayers, setNumPlayers] = useState(0);
  const [numScoreItems, setNumScoreItems] = useState(0);

  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [scores, setScores] = useState<number[][]>([]);
  const [scoreItemNames, setScoreItemNames] = useState<string[]>([]);

  const [showTotal, setShowTotal] = useState(false);
  const [playerRanks, setPlayerRanks] = useState<number[]>([]);

  const [loadedRecordId, setLoadedRecordId] = useState<string | null>(null);

  // wrap calculateTotal with useCallback and declare
  const calculateTotal = useCallback((playerIndex: number) => {
    let total = 0;
    for (let i = 0; i < numScoreItems; i++) {
      total += scores[i][playerIndex] || 0;
    }
    return total;
  }, [numScoreItems, scores]); // scores と numScoreItems を依存配列に追加

  //culculate ranking function
  const calculateRanks = useCallback(() => {
    const totals = playerNames.map((_, index) => ({
      playerIndex: index,
      total: calculateTotal(index),
    }));

    // Sort by score
    totals.sort((a, b) => b.total - a.total);

    const ranks = Array(numPlayers).fill(0);
    let currentRank = 1;
    for (let i = 0; i < totals.length; i++) {
      if (i > 0 && totals[i].total < totals[i - 1].total) {
        currentRank = i + 1;
      }
      ranks[totals[i].playerIndex] = currentRank;
    }
    setPlayerRanks(ranks);
  }, [numPlayers, playerNames, calculateTotal]); // numPlayers, playerNames, calculateTotal を依存配列に追加

  useEffect(() => {
    async function initializeSheet() {
      //if a game from the game list was selected
      if (recordId) {
        try {
          const storedRecords: ScoreRecord[] = JSON.parse(localStorage.getItem('scoreRecords') || '[]');
          const recordToLoad = storedRecords.find((record) => record.id === recordId);

          if (recordToLoad) {
            setLoadedRecordId(recordToLoad.id); //set Record Id to LoadedRecordId 

            setGameTitle(recordToLoad.gameTitle);
            setNumPlayers(recordToLoad.numPlayers);
            setNumScoreItems(recordToLoad.numScoreItems);
            setPlayerNames(recordToLoad.playerNames);
            setScoreItemNames(recordToLoad.scoreItemNames);
            const parsedScores = recordToLoad.scores.map((rowArray: number[]) =>
              rowArray.map(cell => (typeof cell === 'string' ? parseFloat(cell) : cell))
            );
            setScores(parsedScores);

            // Show Total when loaded from user record
            setShowTotal(true);

          } else {
            console.error('Record not found.');
            router.push('/records');
          }
        } catch (error) {
          console.error('Error loading record:', error);
          router.push('/records');
        }
      }
      else if (gameId) {
        //reset LoadedRecordId when create new score sheet
        setLoadedRecordId(null); 
        try {
          // fetch games gfrom game.json
          const res = await fetch("/games.json");
          if (!res.ok) throw new Error("Failed to fetch game data");
          const games: GameData[] = await res.json();
          const selectedGame = games.find((game) => game.id === Number(gameId));

          if (selectedGame) {
            setGameTitle(selectedGame.title);
            setNumPlayers(selectedGame.column);
            setNumScoreItems(selectedGame.row);

            //reset palayer's names
            setPlayerNames(
              Array.from(
                { length: selectedGame.column },
                (_, i) => `Player ${i + 1}`
              )
            );

            //reset score
            setScores(
              Array(selectedGame.row)
                .fill(0)
                .map(() => Array(selectedGame.column).fill(0))
            );

            //set score items fron json data
            setScoreItemNames(selectedGame.score_items);
            setShowTotal(false); // hide total when new sheet was loaded
          } else {
            console.error("Game not found.");
            router.push("/"); //
          }
        } catch (error) {
          //return home if the fetching games failed
          console.error('Error loading game data:', error);
          router.push("/");
        }
      } else if (customRows && customColumns && customGameName) {

        setLoadedRecordId(null); //reset LoadedRecordId when create new score sheet
        //Custome Sheet
        const parsedRows = Number(customRows);
        const parsedColumns = Number(customColumns);

        if (
          isNaN(parsedRows) ||
          isNaN(parsedColumns) ||
          parsedRows < 2 ||
          parsedColumns < 1
        ) {
          router.push("/custom-sheet"); // if invalid, return to the custom-sheet page
          return;
        }

        setGameTitle(decodeURIComponent(customGameName));
        setNumPlayers(parsedColumns);
        setNumScoreItems(parsedRows - 1); // -1(deduct total row) from the score items columns
        setPlayerNames(
          //reset player names. Player 1, Player 2 ...
          Array.from({ length: parsedColumns }, (_, i) => `Player ${i + 1}`)
        );
        //reset score items. Item 1, Item 2...
        setScoreItemNames(
          Array.from({ length: parsedRows - 1 }, (_, i) => `Item ${i + 1}`)
        );
        //reset scores to 0
        setScores(
          Array(parsedRows - 1)
            .fill(0)
            .map(() => Array(parsedColumns).fill(0))
        );
        setShowTotal(false); // hide total when new sheet was loaded
      }else {
        // gameId, customRows, customColumns, customGameName, recordId のどれも
        // redirect to custom page when there are not parameters
        router.push("/custom-sheet");
      }
    }

    initializeSheet();
  }, [gameId, customGameName, customRows, customColumns, recordId, router]);


  // useEffect-calculate ranking after reset scores and playerNames 
  // only execute when there is a recordId, showTotal == true, and scores and player names were set
  useEffect(() => {
    if (recordId && showTotal && scores.length > 0 && playerNames.length > 0) {
      calculateRanks();
    }
  }, [recordId, showTotal, scores, playerNames, calculateRanks]);

  //changing player names
  const handlePlayerNameChange = (index: number, newName: string) => {
    const updated = [...playerNames];
    updated[index] = newName;
    setPlayerNames(updated);
  };

  //changing score item names
  const handleScoreItemNameChange = (index: number, newName: string) => {
    const updated = [...scoreItemNames];
    updated[index] = newName;
    setScoreItemNames(updated);
  };

  //entering scores
  const handleScoreChange = (row: number, col: number, value: string) => {
    const newScores = scores.map((r) => [...r]);
    const val = Number(value);
    newScores[row][col] = isNaN(val) ? 0 : val;
    setScores(newScores);
  };

  // Toggle total score
  const handleToggleTotal = () => {
    setShowTotal((prev) => !prev);
    if (!showTotal) {
      // calculate total score when showToal == true
      calculateRanks();
    } else {
      // reset the total score when showTotal == false
      setPlayerRanks(Array(numPlayers).fill(0));
    }
  };

  // UI while loading pages
  if (numPlayers === 0 || numScoreItems === 0) {
    return (
      <main className="flex items-center justify-center h-screen bg-white">
        <p className="text-3xl normal_font">Loading score sheet...</p>
      </main>
    );
  }

  // set background color depend on the score rank
  const getRankBackgroundColor = (playerIndex: number) => {
    if (!showTotal || playerRanks.length === 0) return ""; // no bg color while total showScore == false or score hasn't calculated

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

  //save data handler
  const handleSaveSheet = () => {
    if (gameTitle.trim() === '') {
      alert('Please enter a game title before saving.');
      return;
    }

    try {
      let storedRecords: ScoreRecord[] = JSON.parse(
        localStorage.getItem('scoreRecords') || '[]'
      );
      const currentTime = new Date().toLocaleString(); // Get current date and time for saving

      if (loadedRecordId) {
        // If loadedRecordId exists, it means we are updating an existing record
        const recordIndex = storedRecords.findIndex(
          (record) => record.id === loadedRecordId
        );
        if (recordIndex !== -1) {
          // Update the existing record in the array
          const updatedRecord: ScoreRecord = {
            id: loadedRecordId, // Keep the original ID
            gameTitle,
            playerNames,
            scoreItemNames,
            scores,
            numPlayers,
            numScoreItems,
            createdAt: storedRecords[recordIndex].createdAt, // Keep the original creation date
            lastSavedAt: currentTime, // Update the last saved date
          };
          storedRecords[recordIndex] = updatedRecord;
          localStorage.setItem('scoreRecords', JSON.stringify(storedRecords));
          alert('Score sheet updated successfully!');
        } else {
          // Fallback: If loadedRecordId exists but the record is not found in storage, save as new.
          // This case should ideally not happen if loadedRecordId is managed correctly.
          console.error(
            'Loaded record ID not found in stored records. Saving as new.'
          );
          const newRecordId = Date.now().toString(); // Generate a new ID for this fallback
          const newRecord: ScoreRecord = {
            id: newRecordId,
            gameTitle,
            playerNames,
            scoreItemNames,
            scores,
            numPlayers,
            numScoreItems,
            createdAt: currentTime,
            lastSavedAt: currentTime,
          };
          const updatedRecords = [...storedRecords, newRecord];
          localStorage.setItem('scoreRecords', JSON.stringify(updatedRecords));
          alert('Score sheet saved successfully as a new record!');
          setLoadedRecordId(newRecordId); // Update loadedRecordId to the new ID
        }
      } else {
        // If loadedRecordId is null, it's a new sheet being saved for the first time
        // Check if the free version limit is reached
        if (storedRecords.length >= MAX_FREE_RECORDS) {
          alert(
            `You can only save up to ${MAX_FREE_RECORDS} records in the free version. Please upgrade to save more.`
          );
          return;
        }

        const newRecordId = Date.now().toString(); // Generate a unique ID for the new record
        const newRecord: ScoreRecord = {
          id: newRecordId, // Assign the generated ID
          gameTitle,
          playerNames,
          scoreItemNames,
          scores,
          numPlayers,
          numScoreItems,
          createdAt: currentTime, // Set creation date
          lastSavedAt: currentTime, // Set initial last saved date
        };

        const updatedRecords = [...storedRecords, newRecord];
        localStorage.setItem('scoreRecords', JSON.stringify(updatedRecords));
        alert('Score sheet saved successfully!');
        // IMPORTANT: After the first save, set the generated ID to loadedRecordId.
        // This ensures subsequent saves of this sheet will be updates, not new records.
        setLoadedRecordId(newRecordId);
      }
    } catch (error) {
      console.error('Error saving score sheet:', error);
      alert('Failed to save score sheet. Please try again.');
    }
  };

  return (
    <main
      className="flex flex-col items-center justify-start min-h-screen py-3 px-2 overflow-x-auto bg-cover bg-center bg-no-repeat"
    >
      <div className="flex">
        <h1 className="text-xl font-bold justify-start px-2">{gameTitle}</h1>
        <div className="flex justify-end pl-8">
          <h2 className="text-lg">Score Item: {numScoreItems}</h2>
          <h2 className="text-lg pl-3">Player: {numPlayers}</h2>
        </div>
      </div>

      <div className="overflow-x-auto w-full max-w-4xl sm:max-w-3xl p-1 bg-transparent">
        <table className="min-w-full divide-y divide-gray-400 border border-gray-400 text-base text-white">
          <thead>
            <tr>
              <th className="table_green px-1 py-1 text-center text-base uppercase tracking-wider border-r border-gray-400 w-[80px] max-w-[100px]">
                Score Items
              </th>
              {playerNames.map((name, i) => (
                <th
                  key={i}
                  className={`table_green px-1 py-1 border-r border-gray-400 text-center min-w-[70px] max-w-[80px] ${getRankBackgroundColor(
                    i
                  )}`}
                >
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handlePlayerNameChange(i, e.target.value)}
                    placeholder={`Player ${i + 1}`}
                    className="w-full bg-transparent border-b border-gray-400 focus:outline-none focus:border-gray-400 text-center text-base text-white"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-400">
            {Array.from({ length: numScoreItems }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                <td className="px-1 py-1 border-r border-gray-400 w-24 text-center text-base text-black min-w-[80px] max-w-[100px]">
                  {gameId ? (
                    scoreItemNames[rowIdx]
                  ) : (
                    <input
                      type="text"
                      value={scoreItemNames[rowIdx]}
                      onChange={(e) =>
                        handleScoreItemNameChange(rowIdx, e.target.value)
                      }
                      placeholder={`Item ${rowIdx + 1}`}
                      className="w-full bg-transparent border-b border-gray-400 focus:outline-none focus:border-gray-400 text-base text-black"
                    />
                  )}
                </td>
                {Array.from({ length: numPlayers }).map((_, colIdx) => (
                  <td
                    key={colIdx}
                    className=" px-1 border-r border-gray-400 text-center text-black min-w-[60px] max-w-[80px]"
                  >
                    <input
                      type="number"
                      value={
                        scores[rowIdx][colIdx] === 0
                          ? ""
                          : scores[rowIdx][colIdx]
                      }
                      onChange={(e) =>
                        handleScoreChange(rowIdx, colIdx, e.target.value)
                      }
                      className="w-full text-center text-lg font-bold bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-grey-100 text-black"
                      placeholder="0"
                    />
                  </td>
                ))}
              </tr>
            ))}

            {/* Handle Total row */}
            <tr className="text-xl font-bold text-white text-center table_green">
              <td className="px-2 py-1 border-r border-gray-400">Total</td>
              {Array.from({ length: numPlayers }).map((_, i) => (
                <td
                  key={i}
                  // Add bg-color corresponding to player's score to td
                  className={`px-1 py-0.5 border-r border-gray-400 text-center min-w-[60px] max-w-[80px] ${getRankBackgroundColor(
                    i
                  )}`}
                >
                  {/* show total when showTotal == true */}
                  {showTotal ? calculateTotal(i) : ""}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Buttons under the table */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-4xl mt-4">
        {/* grid1: e,pty grid */}
        <div></div>

        {/* grid 2: middle button */}
        <div className="flex justify-center items-center">
          <button
            onClick={handleToggleTotal}
            className="py-1 px-5 rounded-lg text-lg bg-[#4A4A46] hover:bg-gray-400 text-white w-auto whitespace-nowrap"
          >
            {showTotal ? "Hide Total" : "Show Total"}
          </button>
        </div>

        {/* grid 3 right button */}
        <div className="flex justify-center items-center">
          <button
            onClick={handleSaveSheet}
            className="py-1 px-6 text-lg rounded-full bg-red-800 hover:bg-red-700 text-white shadow-md"
          >
            Save
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl sm:max-w-3xl flex justify-start mt-2 px-2">
        {/* Return to Home button (left side)) */}
        <button
          onClick={() => router.push("/")}
          className="font-bold py-1 pl-4 rounded-base text-base"
        >
          ← Return to Home
        </button>
      </div>
    </main>
  );
}