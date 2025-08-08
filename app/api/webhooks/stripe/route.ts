import { stripe } from "@/app/lib/stripe";
import User from "@/app/server/models/user.modal";
import { headers } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signiture = (await headers()).get("Stripe-Signature") as string;
  let event: Stripe.Event;
  let data: any;
  let eventType: any;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signiture,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error) {
    console.error(error);
    return new Response("Error occured in webhook", { status: 400 });
  }

    data = event.data;
    eventType = event.type;

    if (eventType === "checkout.session.completed") {
      const session = await stripe.checkout.sessions.retrieve(
        data?.object?.id,
        { expand: ["line-items"] }
      );

      const customerId = session?.customer;
      const customer = await stripe.customers.retrieve(customerId as string);
      const priceId = session?.line_items?.data[0]?.price?.id;
      const metadata = data.metadata;

        const allowedPriceIds = [
        process.env.NEXT_PUBLIC_STRIPE_BETA_SIXMONTH_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_BETA_YEAR_PRICE_ID,
      ].filter(Boolean); // undefinedをフィルタリング

       if(priceId && !allowedPriceIds.includes(priceId)){
        return new NextResponse("Price ID does not match", {
            status: 400,
        })
      }

      console.log(metadata, customer, customerId, priceId)
    

    if (metadata && metadata.userId && customerId){
        const userId = metadata.userId;
        const updatedUser = await User.findOneAndUpdate(
            {clerkId : userId},
            { 
                    subscriptionStatus: 'active',
                    stripeCustomerId: customerId,
            },
            {new: true}
        );
        console.log(updatedUser);
        if(!updatedUser){
            return new NextResponse("User nor found", {
                status: 400,
            });
        } else {
            console.log("User updaterd successfully");
        }
    }

    }

    revalidatePath("/", "layout");
    return new NextResponse("Webhook received", {status:200});

  }

