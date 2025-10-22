import { createUser, deleteUser, updateUser } from "@/app/server/lib/db/user";
import { clerkClient } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {

    //webhook verify
    const evt = await verifyWebhook(req);
    const eventType = evt.type;
    const { id } = evt.data;

    //------ User Created ------//
    if (eventType === "user.created") {
      const { id, email_addresses = [], username, primary_email_address_id } = evt.data;

      let primaryEmail: string | null = null;
      //check email
      if (primary_email_address_id && email_addresses.length > 0) {
          const primary = email_addresses.find(
                (email: any) => email.id === primary_email_address_id
      );
        primaryEmail = primary ? primary.email_address : null;
      }  else if (email_addresses.length > 0) {
        primaryEmail = email_addresses[0].email_address;
      }

    // fallback: When there is no email address
      if (!primaryEmail) {
        console.warn("No email found in Clerk webhook payload. Using fallback email.");
        const baseIdentifier = username || id;
        primaryEmail = `${baseIdentifier.substring(0, 10)}-${id.slice(-6)}@noemail.clerk.local`;
      }

      const user = {
        clerkId: id,
        email: primaryEmail,
        username: username|| primaryEmail.split('@')[0], 
      };
      console.log(user);
      
      try {
        // assign user value to newUser 
        const newUser = await createUser(user);

        //Save setafdata in Cleark
        const client = await clerkClient();
        if (newUser) {
          await client.users.updateUserMetadata(id, {
            publicMetadata: {
              userId: newUser._id,
            },
          });
          return NextResponse.json({ message: "User created" }, { status: 201 });
        }  
    } catch (error: any) {
        console.error("Error creating user:", error.message);
        return NextResponse.json({ message: "Failed to create user", error: error.message }, { status: 409 });
      }
    }

    //----- logic of UPDATE Users ----
    else if (eventType === "user.updated") {
      const { id, email_addresses = [], username, primary_email_address_id } = evt.data;
      
      if (!id) {
             console.error("Error: user.updated event received without a valid user ID.");
             return new Response("User ID not found in webhook payload", { status: 400 });
        }

      //Fetch mail address
      let primaryEmail: string | null = null;
      if (primary_email_address_id && email_addresses.length > 0) {
        const primary = email_addresses.find(
            (email: any) => email.id === primary_email_address_id
        );
          primaryEmail = primary ? primary.email_address : null;
        } else if (email_addresses.length > 0) {
            primaryEmail = email_addresses[0].email_address;
        }
    
      //payload for update
      const updatePayload: any = {};
      if (username) {updatePayload.username = username;}
      if (primaryEmail) {updatePayload.email = primaryEmail;}

       try {
        const updatedUser = await updateUser(id, updatePayload);
        return NextResponse.json({
          message: "User updated",
          user: updatedUser,
        });
       } catch (error: any) {
        console.error("Error updating user:", error.message);
        return NextResponse.json({ message: "Failed to update user", error: error.message }, { status: 500 });
       }
      } 

      
    // ---DELETE user logic---
    else if (eventType === "user.deleted") {
      const { id } = evt.data;
      if (!id) {
        console.error("Error: user.deleted event received without a valid user ID.");
        return new Response("User ID not found in webhook payload", { status: 400 });
      }

      
      // call deleteUser only when id exists
       try {
        const deletedUser = await deleteUser(id);
        return NextResponse.json({
          message: "User deleted",
          user: deletedUser,
        });
      } catch (error: any) {
        console.error(
          "Error: user.deleted event received without a valid user ID."
        );
        console.error("Error deleting user:", error.message);
        return NextResponse.json({ message: "Failed to delete user", error: error.message }, { status: 500 });
      }
    }
    return new Response("Webhook received", { status: 200 });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error verifying webhook", { status: 400 });
  }
}
