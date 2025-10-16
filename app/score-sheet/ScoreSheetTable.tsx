// ScoreSheetTable.tsx

/*
* Component: ScoreSheetTable: The main UI component for displaying and editing a score sheet. 
* It renders the game title, score table grid, total scores, player ranks, 
* and controls for selecting the number of players/score items and an associated group.
* Key Feature
* Data Binding: Renders data from the`scoreData` object (passed as props).
* Input Handling: game title, player names, score item names, and scores.
* Input Validation & Sanitization 
* Group Selection: Displays and handles the selection of a group.
*/

import React, { useEffect, useState } from "react";
import he from "he";
import { ScoreData } from "./score-types";
import Select from "react-select";

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
  //Check if screen size is small
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  //Checl if the screen is small
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 500);
    };
    // Check screen size when first rendering or resize
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    // Cleanup function
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Check if the screen is large
  useEffect(() => {
    const checkLgScreen = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    // check screen size when first rendering or resize
    checkLgScreen();
    window.addEventListener("resize", checkLgScreen);
    return () => window.removeEventListener("resize", checkLgScreen);
  }, []);

  // Logic for determining the player names and count to display
   const playerNamesToDisplay = scoreData.playerNames.map(p => p.name) ?? [];
   const numPlayersToDisplay = scoreData.numPlayers; //
   

  // Functions for react-select compoment (select groups, number of items/players)
  // Score Items options
  const scoreItemOptions = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ].map((num) => ({
    value: num,
    label: num.toString(),
  }));

  // Players options
  const playerOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => ({
    value: num,
    label: num.toString(),
  }));

  // Group Options for react-select
  const groupSelectOptions = groupOptions.map((group) => ({
    value: group._id,
    label: group.groupName,
  }));
  //No group option
  const noGroupOption = { value: "", label: "-- No Group --" };
  const allGroupOptions = [noGroupOption, ...groupSelectOptions];

  //Helper function to create a synthetic native Event object to match the parent function's arguments.
  const createSyntheticChangeEvent = (
    value: number
  ): React.ChangeEvent<HTMLSelectElement> => {
    const stringValue = value.toString(); // change values to string as <select> passes the value as a string.
    // Creates an object that pworks like an event object.
    return {
      target: { value: stringValue },
    } as any; // Using 'as any' to bypass TypeScript type checking.
  };

  // Wrapper for Score Items
  const handleScoreSelectChange = (
    selectedOption: { value: number; label: string } | null
  ) => {
    if (selectedOption) {
      const syntheticEvent = createSyntheticChangeEvent(selectedOption.value);
      handleNumScoreItemsChange(syntheticEvent); // Calls the original function passed from the parent.
    }
  };

  // Wrapper for Players
  const handlePlayerSelectChange = (
    selectedOption: { value: number; label: string } | null
  ) => {
    if (selectedOption) {
      const syntheticEvent = createSyntheticChangeEvent(selectedOption.value);
      handleNumPlayersChange(syntheticEvent); // Calls the original function passed from the parent.
    }
  };

  // Wrapper for Group Selection
  const handleGroupReactSelectChange = (
    selectedOption: { value: string; label: string } | null
  ) => {
    const value = selectedOption ? selectedOption.value : ""; // null or option object
    const syntheticEvent = {
      target: { value: value },
    } as React.ChangeEvent<HTMLSelectElement>;
    handleGroupSelect(syntheticEvent); // Calls the original function passed from the parent.
  };


  return (
    <div className="flex flex-col items-center justify-start py-3 px-2 bg-cover bg-center bg-no-repeat">
      <div className="flex flex-wrap justify-center items-center px-2">
        {/* Game Title */}
        <h1 className="text-xl font-bold hand_font mb-2 w-full text-center ">
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
            className="w-full lg:text-4xl text-center bg-transparent border-b-2 border-gray-400 focus:outline-none focus:border-blue-500 text-black font-bold text-2xl py-1 lg:pt-5 lg:pb-3 px-1"
          />
        </h1>

        {/* Groups, number of score items and players selections */}
        <div className="flex flex-col sm:flex-row justify-end items-center text-lg lg:text-xl hand_font text-gray-700 w-full mb-4">
          {/* group selection*/}
          {groupOptions.length > 0 && (
            <>
              <div className="w-full flex justify-end items-center mb-1 text-lg lg:text-xl sm:w-auto sm:justify-start sm:px-3 hand_font text-gray-700">
                <label htmlFor="groupSelect" className="mr-2 whitespace-nowrap">
                  Group:
                </label>
                <div className="w-[150px]">
                  <Select
                    id="groupSelect"
                    options={allGroupOptions}
                    // Finds the option that matches scoreData.groupId. If not found, defaults to "No Group".
                    value={
                      allGroupOptions.find(
                        (opt) => opt.value === scoreData.groupId
                      ) || allGroupOptions[0]
                    }
                    onChange={handleGroupReactSelectChange} // Wrapper for Group Selection
                    isSearchable={false}
                    classNamePrefix="react-select"
                    className="text-base lg:text-xl border text-gray-800 border-gray-400 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    components={{ DropdownIndicator: () => null }}
                  />
                </div>
              </div>
            </>
          )}

          <div className="w-full flex justify-end items-center mb-1  text-lg lg:text-xl hand_font text-gray-700">
            {/* Score Item selection */}
            <label
              htmlFor="numScoreItems" className="mr-2 ml-3 whitespace-nowrap">
              Score Items:
            </label>
            <div className="w-10"> {/* Adjust select width */}
              <Select
                id="numScoreItems"
                options={scoreItemOptions}
                value={scoreItemOptions.find(
                  (opt) => opt.value === scoreData.numScoreItems
                )}
                onChange={handleScoreSelectChange}
                isSearchable={false}
                classNamePrefix="react-select"
                className="text-base lg:text-xl border text-gray-800 border-gray-400 rounded-md focus:ring-blue-500 focus:border-blue-500"
                components={{ DropdownIndicator: () => null }}
              />
            </div>

            {/* Number of players selection */}
            <label htmlFor="numPlayers" className="ml-4 mr-2 whitespace-nowrap">
              Players:
            </label>
            <div className="w-10">{/* Adjust select width*/}
              <Select
                id="numPlayers"
                options={playerOptions}
                value={playerOptions.find((opt) => opt.value === numPlayersToDisplay)}
                onChange={handlePlayerSelectChange}
                isSearchable={false}
                isDisabled={isGroupSelected}
                classNamePrefix="react-select"
                className="text-base lg:text-xl border text-gray-800 border-gray-400 rounded-md focus:ring-blue-500 focus:border-blue-500"
                components={{ DropdownIndicator: () => null }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Apply table styles depending on number of players */}
      <div
        className={`flex overflow-x-auto w-full ${
          numPlayersToDisplay >= 8 && !isLargeScreen
            ? "justify-start"
            : "justify-center"
        }`}
      >
        <div
          className={` ${
            numPlayersToDisplay >= 4 && isSmallScreen
              ? "w-full overflow-x-auto sm:overflow-x-visible"
              : ""
          }`}
        >
          {/* Table component */}
          <div className="inline-block min-w-max bg-transparent ">
            <table className="tableWidth divide-gray-400 border border-gray-400 text-base lg:text-lg text-white min-w-max ">
              <thead className="sticky top-0 z-0">
                <tr>
                  {/* score items' header) */}
                  <th className="table_green py-1 lg:py-2 text-center hand_font uppercase tracking-wider border-r border-gray-400 w-[80px] max-w-[100px] lg:w-[110px] lg:max-w-[110px] sticky left-0 z-0">
                    Score Items
                  </th>
                  {/* Player's header */}
                  {Array.from({ length: numPlayersToDisplay })
                    .map((_, i) => (
                      <th
                        key={i}
                        className={`table_green px-1 py-1 hand_font border-r border-gray-400 text-center min-w-[80px] max-w-[80px] lg:min-w-[80px] 
                      ${getRankBackgroundColor(i)}`}
                      >
                        <input
                          type="text"
                          value={he.decode(playerNamesToDisplay[i])}
                          placeholder={`Player ${i + 1}`}
                          onCompositionStart={() =>
                            handleCompositionStart(`player-${i}`)
                          }
                          onCompositionEnd={(e) =>
                            handleCompositionEnd(
                              `player-${i}`,
                              e.currentTarget.value,
                              (val) => !isGroupSelected && handlePlayerNameChange(i, val),
                              allowedNameRegex,
                              "Player names can only use allowed characters."
                            )
                          }
                          onChange={(e) => {
                            if (!isGroupSelected) {
                                handlePlayerNameChange(i, e.target.value);
                            }
                          }}
                          disabled={isGroupSelected}
                          className="w-full bg-transparent border-b border-gray-400 focus:outline-none focus:border-gray-400 text-center text-white"
                        />
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-400">
                {scoreData.scoreItemNames
                  .slice(0, scoreData.numScoreItems)
                  .map((itemName: string, rowIdx: number) => (
                    <tr key={rowIdx}>
                      {/* Score Items */}
                      <td className="px-1 py-1 lg:py-2 border-r hand_font border-gray-400 w-24 text-center text-black min-w-[80px] max-w-[100px] sticky left-0 z-0 bg-[#f1e9e1]">
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
                          className="w-full bg-transparent border-b border-gray-400 focus:outline-none focus:border-gray-400 text-black"
                        />
                      </td>
                      {/* Enter scores */}
                      {Array.from({ length: numPlayersToDisplay }).map(
                        (_, colIdx) => (
                          <td
                            key={colIdx}
                            className="px-1 border-r hand_font border-gray-400 text-center text-black min-w-[60px] max-w-[80px] lg:min-w-[80px]"
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
                              className="w-full text-center text-lg lg:text-2xl font-bold bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-grey-100 text-black"
                              placeholder="0"
                            />
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                {/* Total */}
                <tr className="text-xl lg:text-2xl font-bold hand_font text-white text-center table_green">
                  <td className="px-2 py-1 border-r hand_font border-gray-400">
                    Total
                  </td>
                  {calculateTotalScores
                    .slice(0, numPlayersToDisplay)
                    .map((total: number, i: number) => (
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