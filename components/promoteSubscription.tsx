// src/components/promoteSubscription.tsx
import React from "react";
import styles from "./promoteSubscription.module.css";
import SubscriptionPromoteButton from "./subscriptionPromoteButton";
import Link from "next/link";

//Definr prop type
interface PromoteSubscriptionProps {
  onClose?: () => void; // optional
}

export default function PromoteSubscription({ onClose }: PromoteSubscriptionProps) {
  return (
    <div className={styles.subscriptionOverlay}>
      <div className={styles.overlayContent}>
        {onClose && (
          <button onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        )}
        <h1 className={styles.title}>Upgrade to Pro to Unlock This Page</h1>
        <p className={styles.description}>
          This page and its features are exclusively available to our Pro members.
        </p>
        <ul className={styles.featureList}>
          <li> Unlock score records up to 500.</li>
          <li> Unlock premium features such as statistics.</li>
        </ul>
        <div className={styles.subscribeButtonsWrapper}>
          <div className={styles.subscribeButton}>
            <SubscriptionPromoteButton
              priceId={
                process.env.NEXT_PUBLIC_STRIPE_BETA_SIXMONTH_PRICE_ID as string
              }
              buttonText="Subscribe for 6 months"
            />
          </div>
          <div className={styles.subscribeButton}>
            <SubscriptionPromoteButton
              priceId={
                process.env.NEXT_PUBLIC_STRIPE_BETA_YEAR_PRICE_ID as string
              }
              buttonText="Subscribe for 12 months"
            />
          </div>
        </div>
      </div>
      {/* Display return to home button only when onClose was passed */}
      {!onClose && (
        <Link href="/" className={styles.homeButtonWrapper}>
          <button className={styles.homeButton}>← Return to Home</button>
        </Link>
      )}
    </div>
  );
}
