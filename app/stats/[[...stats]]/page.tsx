"use client";

/*
* Stats Main Entry page for displaying user statistics.
* It manages user authentication, subscription access control, and tab navigation (Personal/Group)
* Key Functions:
* 1. Data Fetching: Retrieves the current user's record and subscription status.
* 2. Access Control: Display PromoteSubscription component if 'isActiveUser' is false.
* 3. Tab Navigation: Controls the active view ('personal' or 'group') and renders the corresponding sub-component.
*/

import { fetchUserRecord } from "../../actions/user.action.ts";
import LoadingPage from "@/components/loadingPage.tsx";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PromoteSubscription from "@/components/promoteSubscription";
import StatsPage from "./StatsPage";
import GroupStatsPage from "./groupStatsPage.tsx";

type ActiveTab = "personal" | "group";

export default function Stats() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [userData, setUserData] = useState<any>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("personal");
  const router = useRouter();

  //retrieve user data
  useEffect(() => {
    const getUserData = async () => {
      setIsLoadingUserData(true);
      try{
            const userData = await fetchUserRecord();
            setUserData(userData);
      } catch (error) {
        console.error("Failed to fetch user record.");
         throw error;
      }
        setIsLoadingUserData(false);
    };

    if (isSignedIn) {
      getUserData();
    } else if (isLoaded) {
      setIsLoadingUserData(false);
    }
  }, [isSignedIn, isLoaded, user]);

  if (!isLoaded || isLoadingUserData || !userData) {
    return (
      <div>
        <LoadingPage />
      </div>
    );
  }
  const isActiveUser =
    userData?.subscriptionStatus === "active" ||
    userData?.subscriptionStatus === "trialing";
//Pass restriction flg prop
  const isRestricted = !isActiveUser;


  //Display stats page for active user
  // Display tabs and stats for active user
  return (
    <main>
      <div className="p-4 md:p-8">
        <div className="border-b border-gray-200 mb-6">
          {/* Navigation Tab */}
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("personal")}
              className={`
                ${activeTab === "personal"? 
                  "border-[#41490e] text-[#41490e]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
                whitespace-nowrap py-3 px-1 border-b-2 font-bold text-2xl md:text-3xl hand_font
              `}
            >
              Personal Stats
            </button>
            <button
              onClick={() => setActiveTab("group")}
              className={`
                ${activeTab === "group"
                  ? "border-[#41490e] text-[#41490e]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
                whitespace-nowrap py-3 px-1 border-b-2 font-bold text-2xl md:text-3xl hand_font
              `}
            >
              Group Stats
            </button>
          </nav>
        </div>

        {/* Display stats component */}
        <div>
          {activeTab === "personal" && <StatsPage isRestricted={isRestricted} />}
          {activeTab === "group" && <GroupStatsPage />}
        </div>
      </div>
    </main>
  );
}
