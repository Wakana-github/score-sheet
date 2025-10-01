import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Group from "../../server/models/group";

//Function to use fetch group data for client side (using )
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const groups = await Group.find({ userId }).sort({ createdAt: -1 });
  return NextResponse.json(groups);
}