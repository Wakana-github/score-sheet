"use client";

/*
* Personal StatsPage: Displays the user's personal statistics (Personal Stats).
* Key Feature:
* Data Fetching: Fetching personal stats data from api/stats/personal when the user is signed in.
* State Management: Manages loading status, the retrieved statistics data, and the currently selected game for detail view.
* User Display: Shows the user's name and their total gaming statistics.
* Interactive Details: Allows the user to select a specific game via a dropdown to view detailed stats.
*/
import React, { useEffect, useState } from "react";
import LoadingPage from "@/components/loadingPage";
import { useUser } from "@clerk/nextjs";
import StatCard from "@/components/statCard";
import RankCard from "@/components/rankCard";
import Select from "react-select";
import ReturnHomeBtn from "@/components/returnToHomeBtn";
import { fadeInVariants, itemsVariants, gameDetailVariants, detailItemVariants } from '../../lib/variants'
import { motion, AnimatePresence } from "motion/react"
import PromoteSubscription from "@/components/promoteSubscription";

//define stats types
interface GameStats {
  gameTitle: string;
  plays: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  ranks: {
    first: number;
    second: number;
    third: number;
  };
}

interface PersonalStats {
  totalPlays: number;
  mostPlayedGame: string;
  totalRankings: {
    first: number;
    second: number;
    third: number;
  };
  gameDetails: GameStats[];
  isRestricted: boolean;
}

interface StatsPageProps {
  isRestricted: boolean;
}

export default function StatsPage({ isRestricted }: StatsPageProps) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<GameStats | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Fetching the user's personal statistics data from the server and initializing the component for display.
  useEffect(() => {
    const fetchStats = async () => {
      //Exit the function if Clerk hasn't finished loading user data or if the user is not signed in.
      if (!isLoaded || !isSignedIn) return;

      // Start loading state to display the LoadingPage component.
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/stats/personal");
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats(data);
        if (data.gameDetails.length > 0) {
          setSelectedGame(data.gameDetails[0]); // select first game as default
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isLoaded, isSignedIn]);

  if (error) {
        throw error; 
    }

  // Game title options - Calculate options only when stats change
  const gameOptions = React.useMemo(() => {
    if (!stats || stats.gameDetails.length === 0) return [];
    return stats.gameDetails.map((game) => ({
      value: game.gameTitle,
      label: `${game.gameTitle} (${game.plays} plays)`,
    }));
  }, [stats]);

  //Loading page
  if (loading || !isLoaded) {
    return <LoadingPage />;
  }
  //check is user is signed in
  if (!isSignedIn) {
    return <div>Please sign in to view your stats.</div>;
  }

  // Determine if the subscription prompt should be displayed
  const showSubscriptionPrompt = isRestricted || stats?.isRestricted;

  // Display message when there are no records
  if (!stats || stats.totalPlays === 0) {
      if (showSubscriptionPrompt) {
        //// Continue rendering the UI when there is no record and is restricted
      } else {
          // Display message: No records found (user is not restricted)
          return (
              <div className="p-4 md:p-8">
                  No records found. Please save some scores to view your stats.
              </div>
          );
      }
  }

  // Find most played game details for display with play count
  const mostPlayedGameDetails = stats?.gameDetails.find(
    (g) => g.gameTitle === stats?.mostPlayedGame
  );

  //Main content
  return (
    <motion.div variants={fadeInVariants}
                      initial="hidden" 
                      whileInView="show"
                      animate="show" 
                      className="mt-4 p-4 md:p-8 relative">
      {/* title */}
      <motion.h1 variants={itemsVariants}
                 className="text-3xl md:text-4xl font-bold mb-4 hand_font"
      >
        Personal Stats for
        <br />
        <span className="text-4xl md:text-5xl text-[#41490e]">
          
          {user?.publicMetadata?.nickname &&
          typeof user.publicMetadata.nickname === "string"
            ? user.publicMetadata.nickname
            : user?.username}
        </span>
      </motion.h1>

      {/* Total and most played game */}
      <motion.div variants={itemsVariants}  
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 text-2xl md:text-3xl"
      >
        <StatCard title="Total Plays" value={stats?.totalPlays || 0} />
        <StatCard
          title="Most Played Game"
          value={
            mostPlayedGameDetails
              ? `${mostPlayedGameDetails.gameTitle} (${mostPlayedGameDetails.plays} plays)`
              : stats?.mostPlayedGame?? 'N/A'
          }
        />
      </motion.div>

      {/* Total rankkings */}
      <motion.h2 variants={itemsVariants} 
                  className="text-2xl md:text-3xl font-bold hand_font mb-3 md:mb-4"
      >
        Total Rankings
      </motion.h2>
      <motion.div variants={itemsVariants} 
                  className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8"
      >
        <RankCard
          title="Total 1st Places"
          value={stats?.totalRankings.first || 0}
          className="first-color"
        />
        <RankCard
          title="Total 2nd Places"
          value={stats?.totalRankings.second || 0}
          className="second-color"
        />
        <RankCard
          title="Total 3rd Places"
          value={stats?.totalRankings.third || 0}
          className="third-color"
        />
      </motion.div>

      {/* Choose game */}
      <motion.div variants={itemsVariants} >
        <h2 className="text-xl md:text-3xl hand_font mt-8">Select Game Title</h2>
        <Select
          options={gameOptions}
          onChange={(selectedOption) => {
            if (selectedOption) {
              // Use the value (gameTitle) to find the original GameStats object and set it to the state.
              const game = stats?.gameDetails.find(
                (g) => g.gameTitle === selectedOption.value 
              );
              setSelectedGame(game || null);
            } else {
              setSelectedGame(null); // When selection is cleared/deselected
            }
          }}
          // Search for and pass the option object that matches the currently selected game's gameTitle
          value={
            gameOptions.find(
              (option) => option.value === selectedGame?.gameTitle
            ) || null
          }
          placeholder="Select a Game..."
          className="w-full md:w-1/2" // Set width for the wrapper
          isClearable
        />
      </motion.div>

      {/* Stats for selected game */}
      {selectedGame && (
      <AnimatePresence mode="wait" initial={true}> 
        <motion.div 
            // Reruns animation when the game changes
            key={selectedGame.gameTitle} 
            variants={gameDetailVariants} // parent variants
            initial="initial"
            animate="animate"
            exit="exit" // Enable exit animation
            layout
        >
          <motion.h2 variants={detailItemVariants} 
                      className="text-4xl md:text-5xl hand_font font-bold text-[#41490e] pt-4 mb-2"
          >
            {selectedGame.gameTitle}
          </motion.h2>
          <motion.div variants={detailItemVariants}  
                      className="border p-4 pt-0 rounded-lg shadow-md table_green text-white"
          >
            {/* Score Details */}
            <div className="sm:grid sm:grid-cols-2 gap-2 ">
              <div className="p-1 px-3">
                <span className="font-semibold block text-xl md:text-2xl">
                  Total Plays
                </span>
                <span className="text-2xl md:text-3xl">{selectedGame.plays}</span>
              </div>
              <div className="p-1 px-4">
                <span className="font-semibold block text-xl md:text-2xl">
                  Average Score
                </span>
                <span className="text-2xl md:text-3xl">
                  {selectedGame.averageScore.toFixed(2)}
                </span>
              </div>
              <div className="p-1 px-4">
                <span className="font-semibold block text-xl md:text-2xl">
                  Highest
                </span>
                <span className="text-2xl md:text-3xl">
                  {selectedGame.highestScore}
                </span>
              </div>
              <div className="p-1 px-4">
                <span className="font-semibold block text-xl md:text-2xl">
                  Lowest
                </span>
                <span className="text-2xl md:text-3xl">
                  {selectedGame.lowestScore}
                </span>
              </div>
            </div>

            {/* Rank Details */}
            <div className="col-span-3 mt-2 pt-2 border-t text-xl md:text-2xl">
              <span className="font-semibold block mb-1">Ranks Achieved</span>
              <div className="flex justify-between font-semibold text-white mx-3 text-xl">
                <span>
                  🏆 1st:{" "}
                  <span className="text-2xl md:text-3xl ml-5">
                    {" "}
                    {selectedGame.ranks.first}
                  </span>
                </span>
                <span>
                  🥈 2nd:{" "}
                  <span className="text-2xl md:text-3xl ml-5">
                    {" "}
                    {selectedGame.ranks.second}
                  </span>
                </span>
                <span>
                  🥉 3rd:{" "}
                  <span className="text-2xl md:text-3xl ml-5">
                    {" "}
                    {selectedGame.ranks.third}
                  </span>
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
      )}
      <div className="my-8">
        <ReturnHomeBtn/>
      </div>
      {showSubscriptionPrompt && (
          <div>
              <PromoteSubscription />
          </div>
      )}
    </motion.div>
  );
}
