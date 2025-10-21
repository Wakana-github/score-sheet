import Stripe from "stripe";

/*
* Initialize and export the Stripe client for server-side communication with the Stripe API
* This setup is essential for the app to manage payments using the secret key.
*/

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2025-07-30.basil",
    typescript: true,
})