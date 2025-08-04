'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/clerk-react';


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

  // Read Json file
  useEffect(() => {
    fetch('/games.json')
      .then((response) => response.json())
      .then((data: GameData[]) => {
        setGames(data);
      })
      .catch((error) => console.error('Error loading game data:', error));
  }, []); // [] <- render once

  // handle game titles
  const handleGameChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    // set selected game ID. set null when the value is empty.
    setSelectedGameId(value === '' ? null : Number(value));
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
  return (
    <main>
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="hand_font text-3xl pt-4 ">Welcome to</p>
          <h1 className=" hand_font text-5xl font-bold">Score Sheet</h1>

          {/* game select form */}
          <div className="dark_green py-2 my-6 px-3">
            <label htmlFor="game" className="hand_font text-3xl">Choose a game: </label>
            <select
              id="game"
              name="gamelist"
              form="gameform"
              value={selectedGameId === null ? '' : selectedGameId} // set null when the game hass not selected
              onChange={handleGameChange}
              className=" p-2
              rounded-md
              focus:outline-none
              focus:ring-1 focus:dark_green
              outline-none
              border-none
              ring-0
              shadow-none"
            >
              {/* reset the selected game value */}
              <option value="">Choose the game</option>
             {sortedGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.title}
                </option>
              ))}
            </select>
          </div>

          {/* Custom sheet/Score sheet button */}
          <button
            // call handleGoToCustomSheet when selectedGameId = null、otherwise call handleGoToScoreSheet
            onClick={selectedGameId === null ? handleGoToCustomSheet : handleGoToScoreSheet}
            className="dark_green py-2 my-2 w-64"
          >
            <span className="hand_font text-3xl">
              {/* display Custom Sheet when selectedGameId = nul、otherwise display Go to the Score Sheet */}
              {selectedGameId === null ? 'Custom Sheet' : 'Go to the Score Sheet'}
            </span>
          </button>

          {/* my record button */}
          <div className="my-4">
            <button
            onClick={handleViewRecords} 
            className="hand_font text-3xl"
          >
            My Record
          </button>
          </div>

          {/* login / signin button */}
         <div className=" my-7 text-xl flex justify-center items-center gap-4"> {/* flex, justify-center, items-center, gap-4 を追加してボタンを中央に並べる */}
            <SignedOut>
              {/* Sign-in button*/}
              <SignInButton
                mode="modal" // Opens the sign-in form in a modal
              >
                {/* log in button */}
                <button className="bg-transparent border-none  cursor-pointer p-0">
                  <span className=" hand_font text-xl underline">log in</span>
                </button>
              </SignInButton>

              {/* Separator */}
              <span className="text-xl"> / </span>

              {/* Sign-up button */}
              {/* Opens the sign-up form in a modal */}
              <SignUpButton mode="modal">
                {/* sign up button */}
                <button className="bg-[#a81010] rounded-full border-none  cursor-pointer px-3 py-1"> 
                  <span className="text-white hand_font text-xl">sign up</span>
                </button>
              </SignUpButton>
            </SignedOut>

            <SignedIn>
              {/*  Display the user button if signed in */}
              {/* <UserButton /> */}
            </SignedIn>
          </div>
        </div>
      </div>
    </main>
  );
}