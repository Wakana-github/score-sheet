"use server";

/**
 * Securely fetches the database record for the currently logged-in user.
 * It is called by client components or other server actions (e.g., stripe.action.ts).
 * It returns The user's database record, or null if the user is not authenticated.
 */

import { auth } from "@clerk/nextjs/server";
import { getUser } from "@/app/lib/db/user";


export async function fetchUserRecord() {
    // Authentication Check:
    const { userId: clerkId } = await auth();
    if (!clerkId) {
        //return null or throuh the error if user is not login
        return null;  
    }
    
    try {
        //Authentication Check & Data Fetch: Call DB library on server side. The user can only fetch their own data.
        const userRecord = await getUser(clerkId);
        return userRecord;
    } catch (error) {
        console.error("Error fetching user data in server action.", (error as Error).message);
        throw new Error("Failed to load user data.");
    }
}