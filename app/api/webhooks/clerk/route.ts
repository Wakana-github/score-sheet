import { createUser, deleteUser, updateUser } from "@/app/actions/user.action";
import { clerkClient } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    // Do something with payload
    // For this guide, log payload to console
    const { id } = evt.data;
    const eventType = evt.type;

    if (eventType === "user.created") {
      const { id, email_addresses, username } = evt.data;

      //check email
      const primaryEmail = email_addresses && email_addresses.length > 0
        ? email_addresses[0].email_address
        : null;

    if (!primaryEmail) {
        console.error("Error: user.created event received without a primary email address.");
        return new Response('Email address not found in webhook payload', { status: 400 });
    }

      const user = {
        clerkId: id,
        email: email_addresses[0].email_address as string,
        username: username|| primaryEmail.split('@')[0], 
      };
      console.log(user);

      // assign user value to newUser
      const newUser = await createUser(user);

      const client = await clerkClient();
      if (newUser) {
        await client.users.updateUserMetadata(id, {
          publicMetadata: {
            userId: newUser._id,
          },
        });
      }
      return NextResponse.json({ message: "New user created", user: newUser });
    }

    //logic of UPDATE users
    else if (eventType === "user.updated") {
      const { id, email_addresses, username } = evt.data;
      if (id) {
        const updatedUser = await updateUser(id, {
          email: email_addresses[0].email_address,
          username: username,
        });
        return NextResponse.json({
          message: "User updated",
          user: updatedUser,
        });
      } else {
        console.error(
          "Error: user.updated event received without a valid user ID."
        );
        return new Response("User ID not found in webhook payload", {
          status: 400,
        });
      }
    }
    // DELETE user logic
    else if (eventType === "user.deleted") {
      const { id } = evt.data;
      // call deleteUser only when id exists
      if (id) {
        const deletedUser = await deleteUser(id);
        return NextResponse.json({
          message: "User deleted",
          user: deletedUser,
        });
      } else {
        console.error(
          "Error: user.deleted event received without a valid user ID."
        );
        return new Response("User ID not found in webhook payload", {
          status: 400,
        });
      }
    }
    return new Response("Webhook received", { status: 200 });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error verifying webhook", { status: 400 });
  }
}
