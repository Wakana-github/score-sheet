import { stripe } from "@/app/lib/stripe";
import User from "@/app/server/models/user.modal";
import { headers } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";
import { revalidatePath } from "next/cache";
import connectDB from "@/app/server/helper/score-sheet-db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  await connectDB();
  const body = await request.text();
 const signature = request.headers.get("stripe-signature") as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error) {
    console.error("Webhook signature verification failed.", error);
    return new Response("Webhook signature verification failed.", {
      status: 400,
    });
  }

  //secret keys for subscription plan
  const allowedPriceIds = [
    process.env.NEXT_PUBLIC_STRIPE_BETA_SIXMONTH_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_BETA_YEAR_PRICE_ID,
  ].filter(Boolean); // filterling undefined

  try {
    const eventType = event.type;
    console.log(event.type);
    switch (eventType) {
      // Handle Check out complete Event
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // check if session object is not null or undefined
        if (!session) {
          return new NextResponse("Session not found", { status: 400 });
        }
        const customerId = session?.customer;

        const lineItems = (
          await stripe.checkout.sessions.retrieve(session.id, {
            expand: ["line_items"],
          })
        ).line_items;

        const priceId = lineItems?.data[0]?.price?.id;
        const metadata = session.metadata;
        console.log('sessionmetadata',session.metadata) ;
        console.log("📌 CustomerId:", customerId);

        if (priceId && !allowedPriceIds.includes(priceId)) {
          return new NextResponse("Price ID does not match", {
            status: 400,
          });
        }
        console.log(metadata, customerId, priceId);

        if (metadata && metadata.userId && customerId) {
          const userId = metadata.userId;
          const updatedUser = await User.findOneAndUpdate(
            { clerkId: userId },
            {
              subscriptionStatus: "active",
              stripeCustomerId: customerId,
            },
            { new: true }
          );
          console.log(updatedUser);
          if (!updatedUser) {
            return new NextResponse("User nor found", {
              status: 400,
            });
          } else {
            console.log("User updated successfully");
          }
        }
        return new NextResponse("Checkout completed", { status: 200 });
      }

      // Handle subscription updated through User Portal
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription; // receive subscription objects
        const stripeCustomerId = subscription.customer as string;

        const stripeStatus = subscription.status; //receive subscriptionStatus sent from Stripe.
        let dbStatus: "active" | "trialing" | "canceled" | "inactive" = "inactive";

        // Map the Stripe status to the database type
        switch (stripeStatus) {
          case "active":
          case "trialing":
            dbStatus = stripeStatus; // Use 'active' or 'trialing' as is
            break;
          case "canceled":
            dbStatus = "canceled";
            break;
          // Treat all other statuses as 'inactive'
          case "incomplete":
          case "incomplete_expired":
          case "past_due":
          case "unpaid":
          case "paused":
            dbStatus = "inactive";
            break;
          default:
            // Treat unknown statuses as 'inactive' by default
            dbStatus = "inactive";
        }

        const updatedUser = await User.findOneAndUpdate(
          { stripeCustomerId },
          {
            subscriptionStatus: dbStatus, // Update with the mapped status
          },
          { new: true }
        );

        if (!updatedUser) {
          console.error(
            "No user found for subscription update",
            stripeCustomerId
          );
        } else {
          console.log("User subscription updated successfully");
        }
         return new NextResponse("Subscription updated and user status synced", { status: 200 });
      }

      //Handle subscription derlated event
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer;
        const priceId = subscription.items.data[0].price.id;

        if (priceId && !allowedPriceIds.includes(priceId)) {
          return new NextResponse("Price ID does not match", {
            status: 400,
          });
        }

        const updateUser = await User.findOneAndUpdate(
          { stripeCustomerId },
          {
            subscriptionStatus: "inactive",
            stripeCustomerId: "",
          },
          { new: true }
        );

        if (!updateUser) {
          console.error("No user found", stripeCustomerId);
        } else {
          console.log("user updated successfully");
        }
        return new NextResponse("Subscription deleted and user status synced", { status: 200 });
      }

      default:
        // default process of unknown event
        console.log(`Unhandled event type ${eventType}`);
        break;
    }

    revalidatePath("/", "layout");
    return new NextResponse("Webhook received", { status: 200 });
  } catch (err) {
    console.error("Error processing webhook event:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
