import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Group from "../../../server/models/group";
import connectDB from "../../../server/helper/score-sheet-db";

/*
This API Route (app/api/groups/[groupId]/route.ts) handles operations on a single Group resource.
- GET: Fetches a specific group.
- PUT: Updates a specific group.
- DELETE: Deletes a specific group.
All operations verify user authentication and ownership (authorisation).
*/


//-----------------------------------------------------
// GET: Fetches a specific group (Corresponds to client's fetchGroupData)
//-----------------------------------------------------
export async function GET(
  request: Request,
  { params }: { params: { groupId: string } } // Get dynamic segment [groupId] as params
) {
  // Establish DB Connection
  try {
    await connectDB();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Database connection failed (GET):", error.message);
    } else {
      console.error("Database connection failed (GET) unknown error:", error);
    }
    return NextResponse.json({ message: "Database service unavailable" }, { status: 503 });
  }

  // Authentication Check
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const groupId = params.groupId;
    
    // Find the group, verifying ownership (userId)
    const group = await Group.findOne({ _id: groupId, userId }).lean();

    if (!group) {
      // Return 404 if the group ID is not found or user does not own it
      return NextResponse.json({ message: "Group not found or unauthorized access" }, { status: 404 });
    }
    
    return NextResponse.json(JSON.parse(JSON.stringify(group)));
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Single group fetch error:", error.message);
    } else {
      console.error("Single group fetch unknown error:", error);
    }
    return NextResponse.json({ message: "Error fetching group data." }, { status: 500 });
  }
}

//-----------------------------------------------------
// PUT: Updates the group (Corresponds to client's handleSubmit)
//-----------------------------------------------------
export async function PUT(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  // Establish DB Connection
  try {
    await connectDB();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Database connection failed (PUT):", error.message);
    } else {
      console.error("Database connection failed (PUT) unknown error:", error);
    }
    return NextResponse.json({ message: "Database service unavailable" }, { status: 503 });
  }

  // Authentication Check
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const groupId = params.groupId;
    const body = await request.json(); // Data sent from the client

    // Update group name and members
    const updatedGroup = await Group.findOneAndUpdate(
      { _id: groupId, userId }, // Filter: Only update if ID and userId match 
      { 
        groupName: body.groupName,
        members: body.members,
      },
      { new: true } // Return the updated document
    );

    if (!updatedGroup) {
      return NextResponse.json({ message: "Group not found or unauthorized to update" }, { status: 404 });
    }

    return NextResponse.json({ message: "Group updated successfully" });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Group update error:", error.message);
    } else {
      console.error("Group update unknown error:", error);
    }
    return NextResponse.json({ message: "Error updating group data." }, { status: 500 });
  }
}

//-----------------------------------------------------
// DELETE: Deletes the group
//-----------------------------------------------------
export async function DELETE(
  request: Request,
  { params }: { params: { groupId: string } }
) {

  //Establish DB Connection
  try{
    await connectDB();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Database connection failed (DELETE):", error.message);
    } else {
      console.error("Database connection failed (DELETE) unknown error:", error);
    }
    return NextResponse.json({ message: "Database service unavailable" }, { status: 503 });
  }
    // Authentication Check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

  try {
    const groupId = params.groupId;

    // Delete group, verifying ownership
    const deletedGroup = await Group.findOneAndDelete({ _id: groupId, userId });

    if (!deletedGroup) {
      return NextResponse.json(
        { message: "Group not found or unauthorized to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Group deleted successfully" });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Group deletion error:", error.message);
    } else {
      console.error("Group deletion unknown error:", error);
    }
    return NextResponse.json(
      { message: "Error deleting group." },
      { status: 500 }
    );
  }
}