import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Group from "../../server/models/group";
import connectDB from "../../server/helper/score-sheet-db"

//Function to use fetch group data for client side (using )
export async function GET() {

  try {
    await connectDB();
  } catch (error) {
    console.error("Database connection failed in route handler:", error);
    return NextResponse.json({ message: "Database service unavailable" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const groups = await Group.find({ userId }).sort({ createdAt: -1 }).lean(); 
    return NextResponse.json(JSON.parse(JSON.stringify(groups)));
  } catch (error) {
     console.error("Group fetch error:", error);
     return NextResponse.json(
        { message: "An unexpected error occurred while fetching data." }, 
        { status: 500 }
     );
  }
}
