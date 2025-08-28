"use client";

import SubscriptionButton from "@/components/SubscriptionButton";
import { getUser } from "@/app/actions/user.action";
import LoadingPage from "@/components/lodingPage";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PromoteSubscription from "@/components/promoteSubscription";
import StatsPage from "./StatsPage"; 

export default function Stats() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [userData, setUserData] = useState<any>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const router = useRouter();

  //retrieve user data
  useEffect(() =>{
    const getUserData = async () =>{
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

 const isActiveUser = userData?.subscriptionStatus === 'active' ||userData?.subscriptionStatus === 'trialing';


  //Display stats page for active user
// 実際のstatsページのコンテンツをJSX要素として定義
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

  if (isActiveUser) {
    return (
      <main>
        <StatsPage />
      </main>
    );
  }

    return (
    <main>
      {/* Display PromoteSubscription when isActiveUser is false */}
      <PromoteSubscription />
    </main>
  );
};
