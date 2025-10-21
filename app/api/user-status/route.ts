

/*
* GET API Route to fetch the current user's subscription status.
* Fetch subscription status from DB after user Authentication
* and check if limited festures are restricted for the user.
*/

import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { fetchUserRecord } from '../../actions/user.action';


export async function GET(request: Request) {
    // Check authentication 
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const userRecord = await fetchUserRecord();
        const subscriptionStatus = userRecord?.subscriptionStatus;
        const isRestricted = ( subscriptionStatus !== 'active' &&  subscriptionStatus !== 'trialing');
        return NextResponse.json({ 
                isRestricted: isRestricted,
            }, { status: 200 });

       } catch (error) {
        console.error('Error fetching user status:');
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
} 