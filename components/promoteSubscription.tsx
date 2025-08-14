import React, { ReactNode } from "react";
import styles from "./promoteSubscription.module.css";
import SubscriptionPromoteButton from "./subscriptionPromoteButton";

interface PromoteSubscriptionProps {
  children: ReactNode;
}

export default function PromoteSubscription({
  children,
}: PromoteSubscriptionProps) {
 return (
    <div className={styles.pageContainer}>
      <div className={styles.backgroundContent}>{children}</div>

      <div className={styles.subscriptionOverlay}>
        <div className={styles.overlayContent}>
          <h1 className={styles.title}>Upgrade to Pro to Unlock This Page</h1>
          <p className={styles.description}>
            This page and its features are exclusively available to our Pro
            members.
          </p>
          <ul className={styles.featureList}>
            <li>- Unlock score records up to 500.</li>
            <li>- Unlock premium features such as statistics.</li>
          </ul>
          {/* クラス名を subscribeButton に変更 */}
          <div className={styles.subscribeButtonsWrapper} >
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
      </div>
    </div>
  );
}