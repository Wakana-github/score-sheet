// app/score-sheet/page.tsx
"use client";
import useScoreSheet from "./hooks/useScoreSheet";
import ScoreSheetTable from "./ScoreSheetTable";
import PromoteSubscription from "@/components/promoteSubscription";
import { useAuth } from "@clerk/nextjs";
import LoadingPage from "@/components/lodingPage";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ScoreSheetPage() {
  const { isLoaded, isSignedIn } = useAuth(); // Authentication state from Clerk
  const router = useRouter();

  // Use the custom hook to get all the necessary state and handler functions.
  // This centralizes all the business logic, keeping this component clean.
  const {
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
    groupOptions,
    selectedGroupId,
    handleGroupSelect,
    isGroupSelected,
  } = useScoreSheet();

  // Loading Page
  if (loading) {
    return <LoadingPage />;
  }

  return (
    <main>
      <div
        className={`flex flex-col items-center${
          scoreData.numPlayers >= 8 ? "justify-start" : "justify-center"
        } min-h-screen py-3 px-2 bg-cover bg-center bg-no-repeat`}
      >
        <ScoreSheetTable
          scoreData={scoreData}
          showTotal={showTotal}
          playerRanks={playerRanks}
          calculateTotalScores={calculateTotalScores}
          getRankBackgroundColor={getRankBackgroundColor}
          handleCompositionStart={handleCompositionStart}
          handleCompositionEnd={handleCompositionEnd}
          handleGameTitleChange={handleGameTitleChange}
          handlePlayerNameChange={handlePlayerNameChange}
          handleScoreItemNameChange={handleScoreItemNameChange}
          handleScoreChange={handleScoreChange}
          handleNumPlayersChange={handleNumPlayersChange}
          handleNumScoreItemsChange={handleNumScoreItemsChange}
          groupOptions={groupOptions}
          handleGroupSelect={handleGroupSelect}
          isGroupSelected={isGroupSelected}
          allowedTitleRegex={allowedTitleRegex}
          allowedNameRegex={allowedNameRegex}
          allowedScoreRegex={allowedScoreRegex}
          composingRefs={composingRefs}
        />

        {/* Buttons under the table */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-4xl">
          <div></div> {/* empty grid*/}
          <div></div>
          {/*save button */}
          <div className="flex justify-center items-center">
            <button
              onClick={handleSaveSheet}
              className="py-1 px-6 text-lg lg:text-2xl rounded-full hand_font bg-red-800 hover:bg-red-700 text-white shadow-md"
            >
              Save
            </button>
          </div>
        </div>
        {/* Total toggle button */}
        <div className="flex flex-col justify-center items-center  mt-[-30]">
          <button
            onClick={handleToggleTotal}
            className="py-1 px-5 rounded-lg hand_font text-lg lg:text-2xl bg-[#4A4A46] hover:bg-gray-400 text-white w-auto whitespace-nowrap"
          >
            {showTotal ? "Hide Total" : "Show Total"}
          </button>
        </div>

        {/* go to My Records button */}
        <div className="flex flex-col items-center mt-4">
          <button
            onClick={() => router.push("/records")}
            className="bg-gray-600 hover:bg-gray-700 hand_font text-white py-1 px-4 rounded-lg text-lg lg:text-2xl"
          >
            ← Go to My Records
          </button>
        </div>
        {/* Return to Home button */}
        <div className="self-start">
          <Link href="/" passHref>
            <button className="py-1 lg:pl-15 px-2 rounded-lg text-xl lg:text-2xl hand_font mt-2">
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
