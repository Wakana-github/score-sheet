// ScoreSheetTable.tsx
import React, { useEffect, useState } from "react";
import he from "he";
import { ScoreData } from "./score-types"; 


interface ScoreSheetTableProps {
  scoreData: ScoreData;
  showTotal: boolean;
  playerRanks: number[];
  calculateTotalScores: number[];
  getRankBackgroundColor: (index: number) => string;
  handleCompositionStart: (key: string) => void;
  handleCompositionEnd: (
    key: string,
    value: string,
    handler: (value: string) => void,
    regex: RegExp,
    alertMessage: string
  ) => void;
  handleGameTitleChange: (value: string) => void;
  handlePlayerNameChange: (index: number, value: string) => void;
  handleScoreItemNameChange: (index: number, value: string) => void;
  handleScoreChange: (row: number, col: number, value: string) => void;
  handleNumPlayersChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleNumScoreItemsChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  groupOptions: { _id: string; groupName: string }[]; 
  handleGroupSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  isGroupSelected: boolean;
  allowedTitleRegex: RegExp;
  allowedNameRegex: RegExp;
  allowedScoreRegex: RegExp;
  composingRefs: React.MutableRefObject<{ [key: string]: boolean }>;
}

const ScoreSheetTable: React.FC<ScoreSheetTableProps> = ({
  scoreData,
  showTotal,
  playerRanks,
  calculateTotalScores,
  getRankBackgroundColor,
  handleCompositionStart,
  handleCompositionEnd,
  handleGameTitleChange,
  handlePlayerNameChange,
  handleScoreItemNameChange,
  handleScoreChange,
  handleNumPlayersChange,
  handleNumScoreItemsChange,
   groupOptions = [], 
  handleGroupSelect,
  isGroupSelected, 
  allowedTitleRegex,
  allowedNameRegex,
  allowedScoreRegex,
  composingRefs,
}) => {
  //check if creen size is small
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 500);
    };
    // check screen size when first rendering or resize
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    // creenup funciton
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <div className="flex flex-col items-center justify-start py-3 px-2 bg-cover bg-center bg-no-repeat">
      <div className="flex flex-wrap justify-center items-center px-2">
        {/* Game Title */}
        <h1 className="text-xl font-bold hand_font mb-2 w-full text-center">
          <input
            type="text"
            value={he.decode(scoreData.gameTitle)}
            placeholder="Enter Game Title"
            maxLength={35}
            onChange={(e) => handleGameTitleChange(e.target.value)}
            onCompositionStart={(e) => handleCompositionStart("gameTitle")}
            onCompositionEnd={(e) =>
              handleCompositionEnd(
                "gameTitle",
                e.currentTarget.value,
                handleGameTitleChange,
                allowedTitleRegex,
                "Game titles can only contain allowed characters."
              )
            }
            className="w-full text-center bg-transparent border-b-2 border-gray-400 focus:outline-none focus:border-blue-500 text-black font-bold text-2xl py-1 px-2"
          />
        </h1>
        {/* number of score items and players */}
        <div className="flex justify-end items-center text-lg hand_font text-gray-700 w-full mb-4">
          {/* group selection*/}
           {groupOptions.length > 0 && (
            <>
              <label htmlFor="groupSelect" className="mr-2 whitespace-nowrap">
                Group:
              </label>
              <select
                id="groupSelect"
                value={scoreData.groupId || ""} //  Empty string if groupId is null
                onChange={handleGroupSelect}
                className="p-1 border border-gray-400 rounded-md bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- No Group --</option>
                {groupOptions.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.groupName}
                  </option>
                ))}
              </select>
            </>
          )}
          
          {/* Score Item selection */}
          <label htmlFor="numScoreItems" className="mr-2 whitespace-nowrap">
            Score Items:
          </label>
          <select
            id="numScoreItems"
            value={scoreData.numScoreItems}
            onChange={handleNumScoreItemsChange}
            className="p-1 border border-gray-400 rounded-md bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
          {/* Number of players selection */}
          <label htmlFor="numPlayers" className="ml-4 mr-2 whitespace-nowrap">
            Players:
          </label>
          <select
            id="numPlayers"
            value={scoreData.numPlayers}
            onChange={handleNumPlayersChange}
            disabled={isGroupSelected}
            className="p-1 border border-gray-400 rounded-md bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={`flex overflow-x-auto w-full ${
          scoreData.numPlayers >= 8 ? "justify-start" : "justify-center"
        }`}
      >
        <div
          className={` ${
            scoreData.numPlayers >= 4 && isSmallScreen
              ? "w-full overflow-x-auto sm:overflow-x-visible"
              : ""
          }`}
        >
          <div className="inline-block min-w-max bg-transparent ">
            <table className="tableWidth divide-gray-400 border border-gray-400 text-base text-white min-w-max">
              <thead className="sticky top-0 z-0">
                <tr>
                  {/* score items' header) */}
                  <th className="table_green px-1 py-1 text-center text-base hand_font uppercase tracking-wider border-r border-gray-400 w-[80px] max-w-[100px] sticky left-0 z-0">
                    Score Items
                  </th>
                  {/* Player's header */}
                  {scoreData.playerNames
                    .slice(0, scoreData.numPlayers)
                    .map((name, i) => (
                      <th
                        key={i}
                        className={`table_green px-1 py-1 hand_font border-r border-gray-400 text-center min-w-[70px] max-w-[80px] 
                      ${getRankBackgroundColor(i)}`}
                      >
                        <input
                          type="text"
                          value={he.decode(scoreData.playerNames[i])}
                          placeholder={`Player ${i + 1}`}
                          onCompositionStart={() =>
                            handleCompositionStart(`player-${i}`)
                          }
                          onCompositionEnd={(e) =>
                            handleCompositionEnd(
                              `player-${i}`,
                              e.currentTarget.value,
                              (val) => handlePlayerNameChange(i, val),
                              allowedNameRegex,
                              "Player names can only use allowed characters."
                            )
                          }
                          onChange={(e) => {
                            handlePlayerNameChange(i, e.target.value);
                          }}
                          disabled={isGroupSelected} 
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
                      <td className="px-1 py-1 border-r hand_font border-gray-400 w-24 text-center text-base text-black min-w-[80px] max-w-[100px] sticky left-0 z-0 bg-[#f1e9e1]">
                        <input
                          type="text"
                          value={he.decode(scoreData.scoreItemNames[rowIdx])}
                          placeholder={`Item ${rowIdx + 1}`}
                          onCompositionStart={() =>
                            handleCompositionStart(`scoreItem-${rowIdx}`)
                          }
                          onCompositionEnd={(e) =>
                            handleCompositionEnd(
                              `scoreItem-${rowIdx}`,
                              e.currentTarget.value,
                              (val) => handleScoreItemNameChange(rowIdx, val),
                              allowedNameRegex,
                              "Scores can only contain allowed characters."
                            )
                          }
                          onChange={(e) =>
                            handleScoreItemNameChange(rowIdx, e.target.value)
                          }
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
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9\-]*"
                              value={scoreData.scores[rowIdx]?.[colIdx] || ""}
                              onChange={(e) => {
                                // If composingRef is true, ignore onChange.
                                if (
                                  composingRefs.current[
                                    `score-${rowIdx}-${colIdx}`
                                  ]
                                ) {
                                  return;
                                }
                                // Perform a quick validation immediately.
                                if (
                                  allowedScoreRegex.test(e.target.value) ||
                                  e.target.value === ""
                                ) {
                                  handleScoreChange(
                                    rowIdx,
                                    colIdx,
                                    e.target.value
                                  );
                                }
                              }}
                              onCompositionStart={() =>
                                handleCompositionStart(
                                  `score-${rowIdx}-${colIdx}`
                                )
                              }
                              onCompositionEnd={(e) =>
                                handleCompositionEnd(
                                  `score-${rowIdx}-${colIdx}`,
                                  e.currentTarget.value,
                                  (val) =>
                                    handleScoreChange(rowIdx, colIdx, val),
                                  allowedScoreRegex,
                                  "Scores can only contain half-width digits and hyphens."
                                )
                              }
                              className="w-full text-center text-lg font-bold bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-grey-100 text-black"
                              placeholder="0"
                            />
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                {/* Total */}
                <tr className="text-xl font-bold hand_font text-white text-center table_green">
                  <td className="px-2 py-1 border-r hand_font border-gray-400">
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
        </div>
      </div>
    </div>
  );
};

export default ScoreSheetTable;
