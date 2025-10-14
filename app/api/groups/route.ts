import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Group from "../../server/models/group";
import connectDB from "../../server/helper/score-sheet-db"

/* Fetches all group records created by the current user. */ 

export async function GET() {

  // Establish Database Connection
  try {
    await connectDB();
  } catch (error) {
    console.error("Database connection failed", error);
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
     console.error("Group fetch error", error);
     return NextResponse.json(
        { message: "An unexpected error occurred while fetching data." }, 
        { status: 500 }
     );
  }
}
