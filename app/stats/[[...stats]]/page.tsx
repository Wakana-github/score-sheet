"use client";

import SubscriptionButton from "@/components/SubscriptionButton";
import { getUser } from "@/app/actions/user.action";
import LoadingPage from "@/components/lodingPage";
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
      const userData = await getUser(user?.id || "");
      setUserData(userData);
      setIsLoadingUserData(false);
    };

    if (isSignedIn) {
      getUserData();
    } else if (isLoaded) {
      setIsLoadingUserData(false);
    }
  }, [isSignedIn, isLoaded, user]);

  if (!isLoaded || isLoadingUserData) {
    return (
      <div>
        <LoadingPage />
      </div>
    );
  }

  const isActiveUser =
    userData?.subscriptionStatus === "active" ||
    userData?.subscriptionStatus === "trialing";

  //Display stats page for active user
  // Define the actual stats page content as a JSX element
  const statsContent = (
    <div>
      <h1>{user?.username}'s stats </h1>
      <p>subsctription: {userData?.subscriptionStatus}</p>
      <p>id: {userData?._id}</p>
      <p>clerkId: {userData?.clerkId}</p>
      <p>StripeId: {userData?.stripeCustomerId}</p>
      <SubscriptionButton
        subscriptionStatus={userData?.subscriptionStatus}
        stripeCustomerId={userData?.stripeCustomerId}
      />
    </div>
  );

  // Display PromoteSubscription for non-active user
  if (!isActiveUser) {
    return (
      <main>
        <PromoteSubscription />
      </main>
    );
  }

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
                whitespace-nowrap py-3 px-1 border-b-2 font-bold text-2xl hand_font
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
                whitespace-nowrap py-3 px-1 border-b-2 font-bold text-2xl hand_font
              `}
            >
              Group Stats
            </button>
          </nav>
        </div>

        {/* Display stats component */}
        <div>
          {activeTab === "personal" && <StatsPage />}
          {activeTab === "group" && <GroupStatsPage />}
        </div>
      </div>
    </main>
  );
}
