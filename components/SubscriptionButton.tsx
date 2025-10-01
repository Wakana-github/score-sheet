"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { createUserPortalUrl, subscribe } from "@/app/actions/stripe.action";

interface SubscriptionButtonProps {
  subscriptionStatus: "active" | "trialing" | "canceled" | "inactive";
  stripeCustomerId: string;
}

export default function SubscriptionButton({ subscriptionStatus, stripeCustomerId }: SubscriptionButtonProps) {
  const { isSignedIn, user } = useUser();
  const router = useRouter();

  const handleClickSubscribeButton = async () => {
    if (!isSignedIn) {
      throw new Error("User is not signed in");
    }

    const url = await subscribe({
      userId: user?.id || "",
      email: user?.emailAddresses[0]?.emailAddress || "",
      priceId: process.env.NEXT_PUBLIC_STRIPE_BETA_SIXMONTH_PRICE_ID as string,
    });

    if (url) {
      router.push(url);
    } else {
      throw new Error("Failed to subscribe");
    }
  };

  const editPaymentDetails = async () => {
     // check id stripe data exists
    if (!stripeCustomerId) {
      console.error("Error: stripeCustomerId not found.");
      return;
    }
    const url = await createUserPortalUrl(stripeCustomerId);
    if (url) {
      router.push(url);
    } else {
      throw new Error("Failed to create user potal session");
    }
  };

  if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
    return (
      <button
        onClick={editPaymentDetails}
        className="bg-[#f1490c] hover:bg-[#991d1d] text-white text-sm md:text-base  py-2 px-4 rounded"
      >
        Edit payment details
      </button>
    );
  } else {
    return (
      <button
        onClick={handleClickSubscribeButton}
        className="bg-[#f1490c] hover:bg-[#991d1d] text-white text-sm md:text-base  py-1 px-4 rounded"
      >
        Subscribe
      </button>
    );
  }
}