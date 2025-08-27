import { stripe } from "@/app/lib/stripe";
import User from "@/app/server/models/user.model";
import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";
import { revalidatePath } from "next/cache";
import connectDB from "@/app/server/helper/score-sheet-db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  await connectDB();  // Connect to MongoDB
  const body = await request.text(); // Read the raw request body and Stripe signature
  const signature = request.headers.get("stripe-signature") as string;
  let event: Stripe.Event;

  try {
     // Verify the Stripe webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error) {
    console.error("Webhook signature verification failed.", error);
    return new NextResponse("Webhook signature verification failed.", {
      status: 400,
    });
  }

    // List of allowed Stripe price IDs for subscriptions
  const allowedPriceIds = [
    process.env.NEXT_PUBLIC_STRIPE_BETA_SIXMONTH_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_BETA_YEAR_PRICE_ID,
  ].filter(Boolean);

  try {
    const eventType = event.type;
    console.log(`📩 Received event: ${eventType}`);

    switch (eventType) {
      // Handle completed checkout session
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Validate required metadata and subscription info
        if (
          !session ||
          !session.metadata?.userId ||
          !session.customer ||
          !session.subscription
        ) {
          console.error("Missing metadata or subscription info in session");
          return new NextResponse("Missing data", { status: 400 });
        }

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const userId = session.metadata.userId;

        // Retrieve full subscription details from Stripe and expand product info
        const subscription = (await stripe.subscriptions.retrieve(
          subscriptionId,
          {
            expand: ["items.data.price.product"],
          }
        )) as Stripe.Subscription;

        const item = subscription.items.data[0];

         // Safely get the plan name
        let planName = "Unknown Plan";
        if (
          typeof item.price.product !== "string" &&
          item.price.product &&
          "name" in item.price.product
        ) {
          planName = item.price.product.name;
        }

        const subscriptionEndsAt = item.current_period_end
          ? new Date(item.current_period_end * 1000)
          : new Date();
        const priceId = item.price.id || "";

         // Check if priceId is allowed
        if (!allowedPriceIds.includes(priceId)) {
          console.warn(`⚠️ Price ID ${priceId} does not match allowed IDs.`);
          return new NextResponse("Price ID does not match", { status: 400 });
        }

        // Update or create user in database with subscription info
        const updatedUser = await User.findOneAndUpdate(
          { clerkId: userId },
          {
            subscriptionStatus: subscription.status,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            planName,
            subscriptionEndsAt,
          },
          { new: true, upsert: true }
        );

        if (!updatedUser) {
          return new NextResponse("User not found", { status: 400 });
        }

        console.log("User updated successfully");
        return new NextResponse("Checkout completed", { status: 200 });
      }

      // Handle subscription updates
      case "customer.subscription.updated": {
         const subscriptionId = (event.data.object as Stripe.Subscription).id;

         // Retrieve subscription details from Stripe with product info expanded
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price.product"]
  });
        
        
        const item = subscription.items.data[0];

        // Safely get the plan name
        let planName = "Unknown Plan";
        if (
          typeof item.price.product !== "string" &&
          item.price.product &&
          "name" in item.price.product
        ) {
          planName = item.price.product.name;
        }
        
        // Calculate subscription end date
        const subscriptionEndsAt = item.current_period_end
          ? new Date(item.current_period_end * 1000)
          : new Date();
        const priceId = item.price.id || "";


        // Map Stripe subscription status to DB status
        const stripeStatus = subscription.status;
        let dbStatus: "active" | "trialing" | "canceled" | "inactive" =
          "inactive";
        switch (stripeStatus) {
          case "active":
          case "trialing":
            dbStatus = stripeStatus;
            break;
          case "canceled":
            dbStatus = "canceled";
            break;
          default:
            dbStatus = "inactive";
        }

        // Update user subscription info in the database
        const updatedUser = await User.findOneAndUpdate(
          { stripeCustomerId: subscription.customer as string },
          {
            subscriptionStatus: dbStatus,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            planName,
            subscriptionEndsAt,
          },
          { new: true, upsert: true }
        );

        console.log("updateUser:", updatedUser);
        return new NextResponse("Subscription updated and user status synced", {
          status: 200,
        });
      }

      // Handle subscription deletion
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
         const stripeStatus = subscription.status;
        let dbStatus: "active" | "trialing" | "canceled" | "inactive" =
          "inactive";
        switch (stripeStatus) {
          case "active":
          case "trialing":
            dbStatus = stripeStatus;
            break;
          case "canceled":
            dbStatus = "canceled";
            break;
          default:
            dbStatus = "inactive";
        }

        // Clear user's subscription info in DB
        const updatedUser = await User.findOneAndUpdate(
          { stripeCustomerId: subscription.customer as string },
          {
            subscriptionStatus: dbStatus,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            stripePriceId: null,
            planName: null,
            subscriptionEndsAt: null,
          },
          { new: true }
        );
        return new NextResponse("Subscription deleted and user status synced", {
          status: 200,
        });
      }

      default:
        console.log(`Unhandled event type ${eventType}`);
        break;
    }


    // Revalidate Next.js path cache for the homepage
    revalidatePath("/", "layout");
    return new NextResponse("Webhook received", { status: 200 });
  } catch (err) {
    console.error("Error processing webhook event:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
