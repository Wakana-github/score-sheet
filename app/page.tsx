'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/clerk-react';
import Select from 'react-select'; 

/**
 * Home Component (Landing Page) - the root page (/) of the application. 
 * It serves as the main entry point where users can choose a game, navigate to custom sheet creation, 
 * view their records, or authenticate (sign in/sign up).
 * * Key Functions:
 * 1. Fetches the list of available games from the API on mount.
 * 2. Allows users to select a game from a dropdown (Select component).
 * 3. Provides dynamic navigation buttons: "Go to the Score Sheet" (if a game is selected) 
 * or "Custom Sheet" (if no game is selected).
 * 4. Displays Clerk authentication buttons (Sign In/Sign Up) for signed-out users.
 */


interface GameData {
  id: number;
  title: string;
  column: number;
  row: number;
  notes: string;
  score_items: string[];
}


export default function Home() {
  const [games, setGames] = useState<GameData[]>([]);
  // ret default as null
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const router = useRouter();

  // Fetch game data from API
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    fetch(`${baseUrl}/games`)
      .then((response) => response.json())
      .then((data: GameData[]) => {
        setGames(data);
      })
      .catch((error) => console.error('Error loading game data:', error));
  }, []); // [] <- render once

  // handle game titles
  const handleGameChange = (selectedOption: { value: number, label: string } | null) => {
     setSelectedGameId(selectedOption ? selectedOption.value : null);
  };

  // Go To Score Sheet button handler
  const handleGoToScoreSheet = () => {
    if (selectedGameId !== null) {
      router.push(`/score-sheet?gameId=${selectedGameId}`);
    }
  };

  // Go To Custom sheet handler
  const handleGoToCustomSheet = () => {
    router.push('/custom-sheet'); // render custom-sheet 
  };

   // My Record button handler
  const handleViewRecords = () => {
    router.push('/records'); // render my record page
  };

  //Change Nickname handler
  const handleGoToNicknamePage = () => {
    router.push('/set-nickname');
  };

  // while loading data
  if (games.length === 0) {
    return (
      <main className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-3xl hand_font">Loading games...</p>
        </div>
      </main>
    );
  }
  const sortedGames = [...games].sort((a, b) => a.title.localeCompare(b.title));
  
  //Alter sortedGame options to react-select options for the drop box
  const gameOptions = sortedGames.map(game => ({
     value: game.id, 
     label: game.title,
  }));


  return (
    <main>
     <div className="relative h-screen flex items-center justify-center overflow-hidden
                    bouncy-animation is-animated anim-box"> 
        <div className="text-center">
          <p className="hand_font text-2xl lg:text-4xl pt-4 ">Welcome to</p>
          <h1 className=" hand_font text-4xl lg:text-6xl font-bold">Score Sheet</h1>

          {/* game select form */}
          <div className="dark_green lg:py-2 my-4 lg:my-10 px-3 flex items-center rounded-lg">
            <label htmlFor="game" className="hand_font text-2xl lg:text-4xl">Choose a game: </label>
            <Select
              id="game"
              name="gamelist"
              form="gameform"
              value={gameOptions.find(option => option.value === selectedGameId) || null}// set null when the game hass not selected
              onChange={handleGameChange}
              className="text-sm md:text-base lg:text-xl py-2 ml-2" 
              placeholder="Choose game"
              options={gameOptions}
              isSearchable={true}
            />
          </div>

          {/* Custom sheet/Score sheet button */}
          <button
            // call handleGoToCustomSheet when selectedGameId = null、otherwise call handleGoToScoreSheet
            onClick={selectedGameId === null ? handleGoToCustomSheet : handleGoToScoreSheet}
            className="dark_green py-2 lg:py-3 px-6 lg:px-8 rounded-lg "
          >
            <span className="hand_font text-2xl lg:text-4xl">
              {/* display Custom Sheet when selectedGameId = nul、otherwise display Go to the Score Sheet */}
              {selectedGameId === null ? 'Custom Sheet' : 'Go to the Score Sheet'}
            </span>
          </button>

          {/* my record button */}
          <div className="mt-2 lg:my-8">
            <button onClick={handleViewRecords} className="hand_font text-2xl lg:text-4xl">
            My Record
          </button>
          </div>

          {/* login / signin button */}
         <div className="my-2 lg:my-4 flex justify-center items-center gap-4 text-lg lg:text-2xl"> {/* flex, justify-center, items-center, gap-4 を追加してボタンを中央に並べる */}
            <SignedOut>
              {/* Sign-in button*/}
              <SignInButton
                mode="modal" // Opens the sign-in form in a modal
              >
                {/* log in button */}
                <button className="bg-transparent border-none  cursor-pointer p-0">
                  <span className=" hand_font underline">log in</span>
                </button>
              </SignInButton>

              {/* Separator */}
              <span> / </span>

              {/* Sign-up button */}
              {/* Opens the sign-up form in a modal */}
              <SignUpButton mode="modal">
                {/* sign up button */}
                <button className="bg-[#a81010] rounded-full border-none  cursor-pointer px-3 py-1"> 
                  <span className="text-white hand_font">sign up</span>
                </button>
              </SignUpButton>
            </SignedOut>
          </div>
        </div>
     </div>
    </main>
  );
}