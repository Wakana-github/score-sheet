"use client";

import { createUserPortalUrl, subscribe } from "@/app/actions/stripe.action";
import { getUser } from "@/app/actions/user.action";
import LoadingPage from "@/components/lodingPage";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Stats() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [userData, setUserData] = useState<any>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const router = useRouter();

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
   

   const handleClickSubscribeButton = async() =>{
    if(!isSignedIn){
      throw new Error("User is not signed in");
    }

    const url= await subscribe({
      userId: user?.id || "",
      email: user?.emailAddresses[0]?.emailAddress || "",
      priceId: process.env.NEXT_PUBLIC_STRIPE_BETA_SIXMONTH_PRICE_ID as string
    });
44
    if(url){
      router.push(url);
    } else {
      throw new Error("Failed to subscribe");
    }

   };

    const editPaymentDetails = async() =>{

      // データが存在するかを事前にチェック
  if (!userData || !userData.stripeCustomerId) {
    console.error("Error: stripeCustomerId not found.");
    return; // 処理を中断
  }

      const url= await createUserPortalUrl(userData.stripeCustomerId);
      if(url){
        router.push(url)
      } else{
        throw new Error("Failed to create user potal session");
      }
    }


  if (!isLoaded || isLoadingUserData) {
    return (
      <div>
        <LoadingPage />
      </div>
    );
  }

return(
  <div>
    <h1>{user?.username}'s stats </h1>
    <p>subsctription: {userData?.subscriptionStatus}</p>
    <p>id: {userData?._id}</p>
    <p>clerkId: {userData?.clerkId}</p>
    <p>StripeId: {userData?.stripeCustomerId}</p>
    {userData?.subscriptionStatus === "active" || userData?.subscriptionStatus ==="trialing" ? (
      // サブスクリプション中のユーザー
      <div>
        <h1>Hello `{userData?.username}`</h1>
        <p>You are a subscribed user</p>
        <button
          onClick={editPaymentDetails}
          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
        >
          Edit payment details
        </button>
      </div>
    ) : (
      // サブスクリプションしていないユーザー
      <div>
        <p>You need to subscribe to see this page.</p>
        <button
          onClick={handleClickSubscribeButton}
          className="bg-green-500 hover:bg-green-600 text-white p-2 rounded"
        >
          Subscribe
        </button>
      </div>
    )}
  </div>
);
};
