import { NextResponse } from "next/server";
import connectDB from "../../server/helper/score-sheet-db";
import Game from "../../server/models/game";

// GET /api/games
export async function GET() {
  try {
    await connectDB();

    // Fetch all games
    const games = await Game.find().sort({ title: 1 }).lean();

    // respond to client
    return NextResponse.json(games);
  } catch (error) {
    console.error("Error fetching games");
    return NextResponse.json({ message: "Failed to fetch game data" }, { status: 500 });
  }
}