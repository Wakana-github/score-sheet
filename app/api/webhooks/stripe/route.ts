import { stripe } from "@/app/lib/stripe";
import User from "@/app/lib/db/models/user.model";
import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";
import { revalidatePath } from "next/cache";
import connectDB from "@/app/lib/db/score-sheet-db";

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
      console.error("Stripe Webhook signature verification failed.");
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
    console.log(`Received Stripe event: ${eventType}`);

    switch (eventType) {
      // ------ Handle completed checkout session ---------
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
        const priceId = item.price.id || "";

         // Safely get the plan name
        const planName =
          typeof item.price.product !== "string" && item.price.product && "name" in item.price.product
            ? item.price.product.name
            : "Unknown Plan";

        
        const subscriptionEndsAt = item.current_period_end
          ? new Date(item.current_period_end * 1000)
          : new Date();
        

         // Check if priceId is allowed
        if (!allowedPriceIds.includes(priceId)) {
          console.warn(`Price ID ${priceId} does not match allowed IDs.`);
          return new NextResponse("Price ID does not match", { status: 400 });
        }

        // Map subscription status
        const dbStatus = ["active", "trialing", "past_due", "unpaid"].includes(subscription.status)
          ? subscription.status
          : subscription.status === "canceled" ? "canceled" : "inactive";

        // Update or create user in database with subscription info
        const updatedUser = await User.findOneAndUpdate(
          { clerkId: userId },
          {
            subscriptionStatus: dbStatus,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            planName,
            subscriptionEndsAt,
          },
          { new: true, upsert: true  } //create record even if clark Id is not found
        );

        if (!updatedUser) {
          console.error(`User not found for update`);
          return new NextResponse("User not found", { status: 400 });
        }

        console.log("User updated successfully");
        return new NextResponse("Checkout completed", { status: 200 });
      }


      // ----Handle subscription creation (API direct) and updates (Recurring)--------
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = (event.data.object as Stripe.Subscription).id;
        const stripeCustomerId = subscription.customer as string;

        // Retrieve subscription details from Stripe with product info expanded
        const fullSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price.product"]
        });
        const item = fullSubscription.items.data[0];

        // Safely get the plan name
        const planName =
          typeof item.price.product !== "string" && item.price.product && "name" in item.price.product
            ? item.price.product.name
            : "Unknown Plan";
        
        const priceId = item.price.id || "";

        // Calculate subscription end date
        const subscriptionEndsAt = item.current_period_end
          ? new Date(item.current_period_end * 1000)
          : new Date();
        


        // Map Stripe subscription status to DB status
        const stripeStatus = subscription.status;
        const dbStatus = ["active", "trialing", "past_due", "unpaid"].includes(stripeStatus)
          ? stripeStatus
          : stripeStatus === "canceled" ? "canceled" : "inactive";


        let findQuery: any = { stripeCustomerId };
        // IF there is no Stripe Customer ID in DB (first creation through Stripe API(Dashbord/manual input))
        if (eventType === "customer.subscription.created") {
            // Fetch customer data from Stripe
            const customer = await stripe.customers.retrieve(stripeCustomerId);

            if (customer.deleted || !("email" in customer) || !customer.email) {
                console.error(`Customer ${stripeCustomerId} not found or missing email for initial sync.`);
                return new NextResponse("Customer data missing.", { status: 400 });
            }
            //Search customer with email
            findQuery = { email: customer.email };
        }

        //Data to update
        const updateData = {
            subscriptionStatus: dbStatus,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            planName,
            subscriptionEndsAt,
        };

        //Update stripeCustomerId whem first created
        if (eventType === "customer.subscription.created") {
            (updateData as any).stripeCustomerId = stripeCustomerId;
        }

        // Update user subscription info in the database 
        const updatedUser = await User.findOneAndUpdate(
          findQuery,
          updateData,
          { new: true}
        );
        
        if (!updatedUser) {
            console.error(`User not found for update/create`);
            return new NextResponse("Upfdate failed", { status: 400 });
        }

        console.log("updateUser:");
        return new NextResponse("Subscription updated.", {status: 200});
      }

      // --- Handle subscription deletion ---
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        //SET stripe status as inactive  
        const dbStatus = "inactive";

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
        return new NextResponse("Subscription removed", {
          status: 200,
        });
      }

      default:
        console.log(`Ignoredevent type ${eventType}`);
        break;
    }


    // Revalidate Next.js path cache for the homepage
    revalidatePath("/", "layout");
    return new NextResponse("Webhook received", { status: 200 });
  } catch (err) {
    console.error("Error processing webhook event:");
    return new NextResponse("Internal server error", { status: 500 });
  }
}
