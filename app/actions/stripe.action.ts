/*
 * Stripe Billing Actions:
 * This module contains server actions for handling user subscriptions,
 * including creating a Stripe Checkout session 
 * and generating a link to the Stripe Customer Billing Portal.
 */


"use server";

// Define input properties from stripe
import { stripe } from "../lib/stripe.ts";
type Props = {
  userId: string;
  email: string;
  priceId: string;
};

// Check if a Stripe customer already exists for the email and creates one if not.
export const subscribe = async ({ userId, email, priceId }: Props) => {
  if (!userId || !email || !priceId) {
    throw new Error("missing required params");
  }

  try {
     // Check if a customer with this email already exists in Stripe
    const existingCustomer = await stripe.customers.list({
      email,
      limit: 1,
    });
    // Retrieve the existing customer ID if found
    let stripeCustomerId = existingCustomer.data.length > 0 ? existingCustomer.data[0]?.id : null;

    // If no customer exists, create a new one
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
      });
      stripeCustomerId = customer.id;
    }

    // Create a new Stripe Checkout session for a subscription
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
        userId,          // Store user ID on DB for later reference by webhooks
      },
      mode: "subscription",      // This checkout session is for a recurring subscription
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
    console.error(error);
  }
};

 // Creates a URL for the Stripe Customer Portal, allowing users to manage their billing.
export async function createUserPortalUrl(customerId: string) {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY!);

  // Create a new Stripe Billing Portal session for the given customer
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_URL}/stats`, //URL that user return
  });

  return session.url;
}
