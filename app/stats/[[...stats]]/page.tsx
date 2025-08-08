"use client";

import { subscribe } from "@/app/actions/stripe.action";
import { getUser } from "@/app/actions/user.action";
import LoadingPage from "@/components/lodingPage";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Stats() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  useEffect(() =>{
    const getUserData = async () =>{
      const userData = await getUser(user?.id || "");
      setUserData(userData);
    };

    if(isSignedIn){
      getUserData();
    }
   }, [isSignedIn, user])
   

   const handleClickSubscribeButton = async() =>{
    if(!isSignedIn){
      throw new Error("User is not signed in");
    }

    const url= await subscribe({
      userId: user?.id || "",
      email: user?.emailAddresses[0]?.emailAddress || "",
      priceId: process.env.NEXT_PUBLIC_STRIPE_BETA_SIXMONTH_PRICE_ID as string
    });

    if(url){
      router.push(url);
    } else {
      throw new Error("Failed to subscribe");
    }

   };

    const editPaymentDetails = async() =>{
      const url= process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL!;
      if(url){
        router.push(url + "?prefilled_email=" +user?.emailAddresses[0]?.emailAddress)
      } else{
        throw new Error("Failed to edit payment details");
      }
    }


  if (!isLoaded) {
    return (
      <div>
        <LoadingPage />
      </div>
    );
  }

  return(
    <div>
      <h1>{user?.username}'s stats </h1>
      {userData?.subscriptionStatus === 'active' || userData?.stripeCustomerId ?(
      <div>
        {
          userData?.subscriptionStatus === 'active' &&
          userData?.stripeCustomerId &&
          `You are a subscribed user`
        }
        {
          !(userData?.subscriptionStatus === 'active') &&
          userData?.stripeCustomerId &&
          `Update your subscription plan`
        }
        
        <button
          // onClick={editPaymentDetails}
          className="">
            Edit payment details
          </button>
          </div>
      ) :(
        <div>
        
        <button
          onClick={handleClickSubscribeButton}
          className="bg-[#4A4A46] hover:bg-gray-400 text-white"
         >
        Subscribe
       </button>
       </div> 
      )}
    </div>
    
  );
};
