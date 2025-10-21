"use client";

/**
 * SubscriptionPromoteButton Component - Using in the promoteSubscription.tsx
 * A flexible, dynamic button for handling subscription status and promotions.
 * If the user is active/trialing, it renders a button to manage payment details via the Stripe Customer Portal.
 * If the user is inactive and 'priceId' and 'buttonText' are provided, it renders a subscribe button 
 * that initiates a Stripe Checkout session for the specified price.
 * Renders nothing if no action is applicable.
 */

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { createUserPortalUrl, subscribe } from "@/app/actions/stripe.action";

// define prop type
interface SubscriptionButtonProps {
  subscriptionStatus?: "active" | "trialing" | "canceled" | "inactive";
  stripeCustomerId?: string;
  priceId?: string; 
  buttonText?: string; 
}

export default function SubscriptionPtomoteButton({ subscriptionStatus, stripeCustomerId, priceId, buttonText }: SubscriptionButtonProps) {
  const { isSignedIn, user } = useUser();
  const router = useRouter();

  const handleClickSubscribeButton = async () => {
    if (!isSignedIn) {
      throw new Error("User is not signed in");
    }
    
    // return error when priceId defined
    if (!priceId) {
      throw new Error("PriceId is required to subscribe.");
    }

    const url = await subscribe({
      priceId: priceId, // use priceId received from props
    });

    if (url) {
      router.push(url);
    } else {
      throw new Error("Failed to subscribe");
    }
  };

  const editPaymentDetails = async () => {
    const url = await createUserPortalUrl();
    if (url) {
      router.push(url);
    } else {
      throw new Error("Failed to create user portal session or Stripe ID not found.");
    }
  };

  if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
    return (
      <button
        onClick={editPaymentDetails}
        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
      >
        Edit payment details
      </button>
    );
  } else if (priceId && buttonText) { // when priceId and buttonText were provided as props
    return (
      <button
        onClick={handleClickSubscribeButton}
        className=""
      >
        {buttonText} {/* Display buttonText */}
      </button>
    );
  } else {
    // dosen't return when both are not applicable 
    return null;
  }
}