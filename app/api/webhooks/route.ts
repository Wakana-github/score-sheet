import { createUser } from '@/app/actions/user.action'
import { clerkClient } from '@clerk/nextjs/server'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest, NextResponse } from 'next/server'


export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req)

    // Do something with payload
    // For this guide, log payload to console
    const { id } = evt.data
    const eventType = evt.type
    console.log(`Received webhook with ID ${id} and event type of ${eventType}`)
    console.log('Webhook payload:', evt.data)

    let newUser;

    if(eventType === "user.created"){
      const { id, email_addresses, username} = evt.data
      const user = {
         clerkId: id,
         email: email_addresses[0].email_address,
         username: username
      };
      console.log(user);
      // assign user value to newUser
      const newUser = await createUser(user);

      const client = await clerkClient();
      if(newUser){
        await client.users.updateUserMetadata(
          id, {
            publicMetadata:{
              userId: newUser._id,
            }
          }

        )};
          return NextResponse.json({message: "New user created", user: newUser });
    }
  

    return new Response('Webhook received', { status: 200 })
  } catch (err) {
    console.error('Error verifying webhook:', err) 
    return new Response('Error verifying webhook', { status: 400 })
  }
}