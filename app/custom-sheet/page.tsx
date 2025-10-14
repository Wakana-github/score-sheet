"use client";

/* Custom setting page: front page to pass user specified custom sheet to score-sheet page */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ReturnHomeBtn from "@/components/returnToHomeBtn";
import {allowedTitleRegex, MAX_SCORE_ITEMS, MAX_PLAYERS, MAX_TITLE_LENGTH} from "../lib/constants"


export default function CustomSheetPage() {
  const [gameName, setGameName] = useState<string>("Custom Game");
  const [scoreItemsCount, setScoreItemsCount] = useState<number | null>(null);
  const [playersCount, setPlayersCount] = useState<number | null>(null);

  // New state variables for scoreItemsCount and playersCount errors
  const [gameNameError, setGameNameError] = useState<string | null>(null);
  const [scoreItemsError, setScoreItemsError] = useState<string | null>(null);
  const [playersError, setPlayersError] = useState<string | null>(null);
  // Initialize Next.js router for navigation
  const router = useRouter();

  //Handle game name change
  const handleGameNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
     if (inputValue.length <= MAX_TITLE_LENGTH ) {
    setGameName(inputValue);
     }
    if (gameNameError) {
      setGameNameError(null); // Clear error when user starts typing
    }
  };

  // The function to set number of score itrems based on user input
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

  // The fuhnction to set number of players based on user input
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

 // Handle 'use this Sheet' button click.
 // Performs validation and navigates to the score sheet page on success.
  const handleUseThisSheet = () => {
    let hasError = false;

    // Reset all errors first
    setGameNameError(null);
    setScoreItemsError(null);
    setPlayersError(null);

    //  Game Name Validation  
    if (gameName.trim() === '') {
      setGameNameError('Please enter a game name.');
      hasError = true;
    } else if (!allowedTitleRegex .test(gameName)) {
      setGameNameError('Game names can only use alphanumeric characters, Japanese characters, and the symbols -, _, and .');
      hasError = true;
    }

    // Score Items Count Validation
    if (scoreItemsCount === null || scoreItemsCount < 1) {
      setScoreItemsError('Must be 1 or greater.'); // Set inline error
      hasError = true;
    }
    if (scoreItemsCount! > MAX_SCORE_ITEMS) {
    setScoreItemsError(`Score items cannot exceed ${MAX_SCORE_ITEMS}`);
    hasError = true;
  }

    // Players Count Validation
    if (playersCount === null || playersCount < 1) {
      setPlayersError('Must be 1 or greater'); // Set inline error
      hasError = true;
    }
    if (playersCount! > MAX_PLAYERS) {
    setPlayersError(`players cannot exceed ${MAX_PLAYERS}`);
    hasError = true;
  }

    // If any error occurred, stop the process
    if (hasError) {
      return;
    }

    // If no errors, prepare data and navigate
    const finalGameName = gameName.trim();
    const finalRows = scoreItemsCount! + 1; // The total number of rows includes the header row
    const finalColumns = playersCount!;

    // Redirect to the score sheet page, passing parameters via query string
    router.push(`./score-sheet?name=${encodeURIComponent(finalGameName)}&rows=${finalRows}&columns=${finalColumns}`);
  };

  const handleReturnToHome = () => {
    router.push("/"); // Return to the home page
  };

  return (
    <main>
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-2xl lg:text-4xl hand_font pt-2 ">Create Your Own</p>
          <h1 className="hand_font text-4xl lg:text-6xl font-bold">Custom Sheet</h1>

          {/* Game name Input Section*/}
          <div className="mt-3 lg:mt-5">
            <label htmlFor="gameName" className="text-2xl hand_font block md:text-3xl">
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

          {/* flex container for Score Items and Players*/}
          <div className="flex justify-center items-center space-x-4 mb-2">
            {" "}
            {/* number of score items Input Section */}
            <div className="flex flex-col items-center mt-2">
              <label htmlFor="scoreItemsCount" className="text-2xl md:text-3xl hand_font">
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
                <p className=" text-red-500 text-xs lg:text-base  mt-1">{scoreItemsError}</p>
              )}
            </div>

            {/* number of players Input Section*/}
            <div className="flex flex-col items-center mt-1">
              <label htmlFor="playersCount" className="text-2xl md:text-3xl hand_font">
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
                <p className="text-red-500 text-xs lg:text-base mt-1">{playersError}</p>
              )}
            </div>
          </div>

          {/* Use this sheet button  */}
          <button
            onClick={handleUseThisSheet}
            className="dark_green font-bold hand_font py-2 lg:py-3 px-6 rounded-lg text-2xl lg:text-4xl mt-3 lg:mt-4 w-[100%] max-w-xs"
          >
            Use This Sheet
          </button>

          {/* Return to Home button */}
          <div
            onClick={handleReturnToHome}
            className=" py-1 mt-2 lg:mt-7 w-50 flex justify-self-start"
          >
           <ReturnHomeBtn/>
          </div>
        </div>
      </div>
    </main>
  );
}
