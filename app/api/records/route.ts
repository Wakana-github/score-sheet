// app/api/records/route.ts　

/*
* This route is to retrieve and post score record operations (GET, POST)
* Key Feature:
* Authentication & Authorization: using Clerk's 'auth()', fetches the Clerk user token and forwards 
* Data Flow: All request bodies (POST) and query parameters (GET) are 
* transparently forwarded to the external API, and the response is returned to the client.
*/

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { applyRateLimit, handleServerError } from '@/app/lib/rateLimit'; 
import { verifyRequestOrigin, verifyCsrfToken } from "@/app/lib/security";
import { sanitizeAndValidateString, SanitizeResult } from '@/app/lib/sanitizeHelper';
import { checkPlayerNamesStructure, checkScoresStructure } from './recordValidation';
import { getScoreRecords, createScoreRecord } from '@/app/lib/db/record';

import { allowedNameRegex, MAX_TITLE_LENGTH, MAX_NAME_LENGTH, MAX_PLAYERS, allowedTitleRegex, MAX_SCORE_ITEMS } from '@/app/lib/constants';


// Helper function to validate MongoDB ObjectId format
const isValidMongoId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id);
};

// const API_BASE_URL = process.env.INTERNAL_API_BASE_URL;
// if (!API_BASE_URL) {
//   throw new Error('INTERNAL_API_BASE_URL is not defined in environment variables.');
// }

// ----- GET:Fetch all records----------------
export async function GET(request: Request) {
  const { userId } =await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
      //check rate limit
      try {
        const allowed = await applyRateLimit(userId, 'read');
        if (!allowed) return NextResponse.json({ message: 'Too many requests. Try later.' }, { status: 429 });
      } catch (rateErr) {
        console.error('Rate limit error (GET):', rateErr);
      }

      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const keyword = url.searchParams.get('keyword') || undefined;
      const result = await getScoreRecords(userId, page, keyword);
      if (!result) {
              return NextResponse.json({ message: "User not found." }, { status: 404 });
          }
       if (!Array.isArray(result.records) || result.records.length === 0) {
      return NextResponse.json(result, { status: 200 });
    }
      return NextResponse.json(result, { status: 200 });
  } catch (error) {
          return handleServerError("GET /api/records", error);
  }
}


//POST:Create new record
export async function POST(request: Request) {
  const { userId} =await auth();
  if (!userId) {return NextResponse.json({ message: "Unauthorized" }, { status: 401 });}

  try {
    //Validate Token and Origin
    const originError = verifyRequestOrigin(request);
     if (originError) return originError;
     const csrfError = await verifyCsrfToken(request);
     if (csrfError) return csrfError;

    //Check rate limit
    try {
      const allowed = await applyRateLimit(userId, 'write');
      if (!allowed) return NextResponse.json({ message: 'Too many requests. Try later.' }, { status: 429 });
    } catch (rateErr) {
      console.error('Rate limit error (POST):', rateErr);
    }

    const body = await request.json();
    const { gameTitle, playerNames, scoreItemNames, scores, numPlayers, numScoreItems, custom, groupId } = body;
    
    // validsate groupId 
    if (groupId && typeof groupId === 'string' && !isValidMongoId(groupId)) {
        return NextResponse.json({ message: "Invalid groupId format. Must be a valid MongoDB ObjectId." }, { status: 400 });
    }

    //  validsate and sanitize gameTitle 
    const sanitizedTitle = sanitizeAndValidateString(gameTitle, MAX_TITLE_LENGTH, 'gameTitle', allowedTitleRegex);
    if (sanitizedTitle.error) return NextResponse.json({ message: sanitizedTitle.error }, { status: 400 });

    // validate playerNames
    if (!Array.isArray(playerNames) || playerNames.length > MAX_PLAYERS) {
        return NextResponse.json({ message: "Invalid playerNames data or too many players." }, { status: 400 });
    }
    
    // playerNames Structure Check
    const playerNamesCheck = checkPlayerNamesStructure(playerNames);
    if (playerNamesCheck.error) return NextResponse.json({ message: playerNamesCheck.error }, { status: 400 });

    const usedMemberIds = new Set<string>();
    const processedPlayerNames = [];
    for (const player of playerNames) {

    // Player Name Validation & Sanitization
      const sanitizedName = sanitizeAndValidateString(player.name, MAX_NAME_LENGTH, 'playerName', allowedNameRegex);
      if (sanitizedName.error) {
          return NextResponse.json({ message: sanitizedName.error }, { status: 400 });
      }

    // MemberId Logic (Clerk/Temporary ID)
    let memberIdToSave: string;
    const finalMemberId = player.memberId;

    if (finalMemberId && typeof finalMemberId === 'string') {
            if (usedMemberIds.has(finalMemberId)) {
                return NextResponse.json({ message: `Duplicate member ID found for player: ${sanitizedName.value}.` }, { status: 400 });
            }
            memberIdToSave = finalMemberId;
            usedMemberIds.add(memberIdToSave);
        } else {
            memberIdToSave = `temp-player-${uuidv4()}`; 
        }

        processedPlayerNames.push({
            memberId: memberIdToSave,
            name: sanitizedName.value,
        });
        }

      // validate scoreItemNames 
        if (!Array.isArray(scoreItemNames) || scoreItemNames.length > MAX_SCORE_ITEMS ) {
            return NextResponse.json({ message: "Invalid scoreItemNames data or too many items." }, { status: 400 });
        }
      // score structure check
      const scoresCheck = checkScoresStructure(scores, numScoreItems, numPlayers);
      if (scoresCheck.error) return NextResponse.json({ message: scoresCheck.error }, { status: 400 });

      const sanitizedScoreItemNames = scoreItemNames.map((name: string) => sanitizeAndValidateString(name, MAX_NAME_LENGTH, 'scoreItemNames', allowedNameRegex));
        if (sanitizedScoreItemNames.some((result: any) => result.error)) {
            return NextResponse.json({ message: sanitizedScoreItemNames.find((result: any) => result.error)?.error }, { status: 400 });
        }

        // validate numbers
        if (typeof numPlayers !== 'number' || numPlayers < 1 || numPlayers > MAX_PLAYERS) {
            return NextResponse.json({ message: "Invalid numPlayers." }, { status: 400 });
        }
        if (typeof numScoreItems !== 'number' || numScoreItems < 1 || numScoreItems > MAX_SCORE_ITEMS) {
            return NextResponse.json({ message: "Invalid numScoreItems." }, { status: 400 });
        }
        
        const sanitizedScores = scores.map((row: any[]) => 
            row.map(score => typeof score === 'number' ? score : 0)
        );

        //Create data object
        const newRecordData = {
            gameTitle: sanitizedTitle.value,
            playerNames: processedPlayerNames,
            scoreItemNames: sanitizedScoreItemNames.map((name: any) => name.value),
            scores: sanitizedScores,
            numPlayers,
            numScoreItems,
            custom: typeof custom === 'boolean' ? custom : false,
        };
        const result = await createScoreRecord(userId, newRecordData, groupId);
        
        return NextResponse.json({ message: "Record saved successfully", record: result?.record }, { status: 201 });
  } catch (error) {
    console.error("POST /api/records", error);
    return NextResponse.json({ message: 'An unknown server error occurred during POST.' }, { status: 500 });
  }
}