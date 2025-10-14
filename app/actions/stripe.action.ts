"use server";
/* 
 * Stripe Billing Actions: 
 * This module contains server actions for handling user subscriptions,
 * including creating a Stripe Checkout session 
 * and generating a link to the Stripe Customer Billing Portal.
 */

import { auth } from "@clerk/nextjs/server";
import { updateUser  } from '../server/lib/db/user.ts';
import { fetchUserRecord } from "./user.action"; 
import { stripe } from "../lib/stripe.ts";

// Define the input properties for the subscription action
type SubscribeProps = {
  priceId: string; // The ID of the Stripe subscription plan.
};

//Creates a Stripe Checkout session for a new subscription
export const subscribe = async ({ priceId }: SubscribeProps) => {
  //retrieve the logged-in user's Clerk ID
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("User not authenticated."); // Throws an error if the user is not authenticated
  }
  // validation
  if (!priceId) {
    throw new Error("Missing required priceId");
  }

  // Fetch user data from the database 
  const userRecord = await fetchUserRecord(); 
  if (!userRecord || !userRecord.email || !userRecord._id) {
      throw new Error("User data is missing or incomplete.");
  }
  const { email, _id: dbUserId } = userRecord; // Destructure the required info from the database record

  // Retrieve Stripe Customer ID from DB
  let stripeCustomerId = userRecord.stripeCustomerId;

  //Check and create customer on Stripe only if not in DB 
if (!stripeCustomerId) {
  try {
    // Check if a customer with this email already exists in Stripe
    const existingCustomer = await stripe.customers.list({
      email,
      limit: 1,
    });
    // Retrieve the existing customer ID if found
    stripeCustomerId = existingCustomer.data.length > 0 ? existingCustomer.data[0]?.id : null;
    

    // If no customer exists, create a new one
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {clerkId},  // Store Clerk ID for easy searching in the Stripe Dashboard
      });
      stripeCustomerId = customer.id;
    }
      // Save the new Stripe Customer ID back to the user record in the database
      await updateUser(clerkId, { stripeCustomerId: stripeCustomerId });
    } catch (error) {
      console.error("Stripe customer creation failed.", (error as Error).message);
      throw new Error("Failed to initialize billing.");
    }
  }


  // 5. Create a new Stripe Checkout session
  try{
    const { url } = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,     // Link the session to the customer
      payment_method_types: ["card"], // Accept card payments
      line_items: [
        {
          price: priceId,      // The price ID for the subscription plan
          quantity: 1,         // Subscribe to one unit
        },
      ],
      metadata: {
        userId: dbUserId.toString(),   // Store user ID on DB 
      },
      mode: "subscription",      
      billing_address_collection: "required",   
      customer_update: {
        name: "auto",
        address: "auto",
      },
      // Redirect URLs after successful or cancelled checkout
      success_url: `${process.env.NEXT_PUBLIC_URL}/payments/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/payments/cancel`,
    });

    return url;
  } catch (error) {
    console.error("Error creating subscription.", (error as Error).message);
    throw new Error("Failed to create subscription session.");
  }
};



 // Creates a URL for the Stripe Customer Portal, allowing users to manage their billing.
export async function createUserPortalUrl() {
  // SECURITY CHECK: retrieve the logged-in user's Clerk ID
  const { userId: clerkId } = await auth();
    if (!clerkId) {
    throw new Error("User not authenticated.");
  }

  // Fetch user data from the database
  const userRecord = await fetchUserRecord();
  const customerId = userRecord?.stripeCustomerId;  // retrieve 'stripeCustomerId' ftom user record

  if (!customerId) {
    throw new Error("Stripe customer ID not found. User must have a subscription first.");
  }

  // Create a new Stripe Billing Portal session for the retrieved customer
  try {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_URL}/stats`, //URL that user return
  });

  return session.url;

  } catch (error) {
      console.error("Error creating portal URL.", (error as Error).message);
      throw new Error("Failed to create billing portal session.");
  }
}
