import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Group from "../../server/models/group";
import connectDB from "../../server/helper/score-sheet-db"

/*
This API Route (app/api/groups/route.ts) handles operations on the entire Group collection.
GET: Fetches a list of all groups belonging to the authenticated user.
POST: Creates a new group record in the database after authenticating the user and validating the request body.
*/

/* GET: Fetches all group records created by the current user. */ 
export async function GET() {

  // Establish Database Connection
  try {
    await connectDB();
  } catch (error) {
    if (error instanceof Error) {
      console.error("Database connection failed:", error.message);
    } else {
      console.error("Database connection failed:", error);
    }
    return NextResponse.json({ message: "Database service unavailable" }, { status: 503 });
  }
  //Authentication Check
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  //Fetch User-Specific Data
  try {
    const groups = await Group.find({ userId }).sort({ createdAt: -1 }).lean(); // Find groups 
    return NextResponse.json(JSON.parse(JSON.stringify(groups)));
  } catch (error) {
     if (error instanceof Error) {
      console.error("Group fetch error:", error.message);
    } else {
      console.error("Group fetch error:", error);
    }
     return NextResponse.json(
        { message: "An unexpected error occurred while fetching data." }, 
        { status: 500 }
     );
  }
}

/* POST:" Create new groiup record */
export async function POST(request: Request) {
  // Connect DB
  try {
    await connectDB();
  } catch (error) {
    if (error instanceof Error) {
      console.error("Database connection failed:", error.message);
    } else {
      console.error("Database connection failed:", error);
    }
    return NextResponse.json({ message: "Database service unavailable" }, { status: 503 });
  }

  // Authentication check
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    // check request body
    const body = await request.json();
    const { groupName, members } = body;
    
    if (!groupName || !members || members.length === 0) {
        return NextResponse.json({ message: "Missing group name or members data." }, { status: 400 });
    }

    // Create group instance and save it
    const newGroup = await Group.create({
      userId, 
      groupName,
      members,
    });

    // return success response (HTTP 201 Created)
    return NextResponse.json(
      { message: "Group created successfully", group: newGroup }, 
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error("Group creation error:", error.message);
    } else {
      console.error("Group creation error:", error);
    }
    return NextResponse.json(
      { message: "An unexpected error occurred while creating the group." }, 
      { status: 500 }
    );
  }
}