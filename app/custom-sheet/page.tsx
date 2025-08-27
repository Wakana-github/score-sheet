"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";


export default function CustomSheetPage() {
  const [gameName, setGameName] = useState<string>("Custom Game");
  const [scoreItemsCount, setScoreItemsCount] = useState<number | null>(null);
  const [playersCount, setPlayersCount] = useState<number | null>(null);

  // New state variables for scoreItemsCount and playersCount errors
  const [gameNameError, setGameNameError] = useState<string | null>(null);
  const [scoreItemsError, setScoreItemsError] = useState<string | null>(null);
  const [playersError, setPlayersError] = useState<string | null>(null);

  const router = useRouter();

  const handleGameNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
     if (inputValue.length <= 35 ) {
    setGameName(inputValue);
     }
    if (gameNameError) {
      setGameNameError(null); // Clear error when user starts typing
    }
  };

  const handleScoreItemsCountChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputValue = event.target.value;
    if (inputValue === "") {
      setScoreItemsCount(null); // Set to null if input is empty
    } else {
      const numericValue = Number(inputValue);
      if (!isNaN(numericValue)) {
        setScoreItemsCount(numericValue);
      }
    }
    if (scoreItemsError) {
      setScoreItemsError(null); // Clear error when user starts typing
    }
  };

  const handlePlayersCountChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputValue = event.target.value;
    if (inputValue === "") {
      setPlayersCount(null); // Set to null if input is empty
    } else {
      const numericValue = Number(inputValue);
      if (!isNaN(numericValue)) {
        setPlayersCount(numericValue);
      }
    }
    if (playersError) {
      setPlayersError(null); // Clear error when user starts typing
    }
  };

  const handleUseThisSheet = () => {
    let hasError = false;

    // Reset all errors first
    setGameNameError(null);
    setScoreItemsError(null);
    setPlayersError(null);

    // 1. Game Name Validation
   const allowedCharsRegex =  /^[a-zA-Z0-9Ａ-Ｚａ-ｚ０-９\sぁ-んァ-ヶ一-龠ー\-_\.]*$/; //allow alphanumeric and Japanese characters, and some symbols.
    
    //If empty name
    if (gameName.trim() === '') {
      setGameNameError('Please enter a game name.');
      hasError = true;
    } else if (!allowedCharsRegex.test(gameName)) {
      setGameNameError('Game names can only use alphanumeric characters, Japanese characters, and the symbols -, _, and .');
      hasError = true;
    }

    // 2. Score Items Count Validation
    if (scoreItemsCount === null || scoreItemsCount < 1) {
      setScoreItemsError('Must be 1 or greater.'); // Set inline error
      hasError = true;
    }
    if (scoreItemsCount! > 15) {
    setScoreItemsError('Score items cannot exceed 15');
    hasError = true;
  }

    // 3. Players Count Validation
    if (playersCount === null || playersCount < 1) {
      setPlayersError('Must be 1 or greater'); // Set inline error
      hasError = true;
    }
    if (playersCount! > 10) {
    setPlayersError('players cannot exceed 10');
    hasError = true;
  }

    // If any error occurred, stop the process
    if (hasError) {
      return;
    }

    // If no errors, proceed to create the sheet
    const finalGameName = gameName.trim();
    const finalRows = scoreItemsCount! + 1;
    const finalColumns = playersCount!;

    router.push(`./score-sheet?name=${encodeURIComponent(finalGameName)}&rows=${finalRows}&columns=${finalColumns}`);
  };

  const handleReturnToHome = () => {
    router.push("/"); // Return to the home page
  };

  return (
    <main>
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-xl hand_font pt-2 ">Create Your Own</p>
          <h1 className="text-4xl hand_font font-bold">Custom Sheet</h1>

          {/* Game name */}
          <div className="mt-3 ">
            <label htmlFor="gameName" className="text-2xl hand_font block">
              Game Name:{" "}
            </label>
            <div className="flex justify-center">
              <input
                type="text"
                id="gameName"
                value={gameName}
                onChange={handleGameNameChange}
                placeholder="My original game"
                className=" text-lg bg-white p-3 rounded-md focus:outline-none focus:ring-1 focus:dark_green outline-none border-none ring-0 shadow-none text-center w-auto"
              />
            </div>
            {gameNameError && (
              <p className=" text-red-500 text-xs mt-1">{gameNameError}</p>
            )}
          </div>

          {/* flex container for rows and coulmns */}
          <div className="flex justify-center items-center space-x-4 mb-2">
            {" "}
            {/* number of score items */}
            <div className="flex flex-col items-center">
              <label htmlFor="scoreItemsCount" className="text-2xl hand_font">
                Score Items: 
              </label>
              <input
                type="number"
                id="scoreItemsCount"
                value={scoreItemsCount === null ? "" : scoreItemsCount}
                onChange={handleScoreItemsCountChange}
                min="1"
                placeholder="5"
                className="text-lg p-2 rounded-md focus:outline-none focus:ring-1 focus:dark_green outline-none border-none ring-0 shadow-none text-center w-24 bg-white"
              />
               {scoreItemsError && (
                <p className=" text-red-500 text-xs mt-1">{scoreItemsError}</p>
              )}
            </div>

            {/* number of players*/}
            <div className="flex flex-col items-center mt-1">
              <label htmlFor="playersCount" className="text-2xl hand_font">
                Players: 
              </label>
              <input
                type="number"
                id="playersCount"
                value={playersCount === null ? "" : playersCount}
                onChange={handlePlayersCountChange}
                min="1"
                placeholder="5"
                className="text-lg bg-white p-2 rounded-md focus:outline-none focus:ring-1 focus:dark_green outline-none border-none ring-0 shadow-none text-center w-24"
              />
               {playersError && (
                <p className="text-red-500 text-xs mt-1">{playersError}</p>
              )}
            </div>
          </div>

          {/* Use this sheet button  */}
          <button
            onClick={handleUseThisSheet}
            className="dark_green font-bold hand_font py-2 px-6 rounded-lg text-2xl mt-3 w-[100%] max-w-xs"
          >
            Use This Sheet
          </button>

          {/* Return to Home button */}
          <div
            onClick={handleReturnToHome}
            className=" py-1 px-2 rounded-lg text-xl hand_font mt-2 w-50 flex justify-self-start"
          >
           ← Return to Home
          </div>
        </div>
      </div>
    </main>
  );
}
