// app/api/records/[id]/route.ts

/* Individual score record API proxy endpoint (GET, PUT, DELETE).
 * This route handles all operations for a specific record identified by its ID (`[id]`)
 * by serving as a secure gateway to the internal backend API
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import {
  getScoreRecordById,
  updateScoreRecord,
  deleteScoreRecord,
} from "@/app/lib/db/record"; // DB Helper
import { applyRateLimit, handleServerError } from "@/app/lib/rateLimit";
import { sanitizeAndValidateString } from "@/app/lib/sanitizeHelper";
import {
  checkPlayerNamesStructure,
  checkScoresStructure,
} from "../recordValidation";
import { verifyRequestOrigin, verifyCsrfToken } from "@/app/lib/security";
import {
  allowedNameRegex,
  allowedTitleRegex,
  MAX_TITLE_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MAX_SCORE_ITEMS,
} from "@/app/lib/constants";

// Helper function to validate MongoDB ObjectId format
const isValidMongoId = (id: string): boolean => {
  return (mongoose.Types.ObjectId as any).isValid(id);
};

type RouteContext = {
  params: { id: string };
};

//GET:Fetch a single record by ID
export async function GET(request: Request, context: { params: { id: string } }) {
  const { userId } = await auth();
  const { id } = await context.params;
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isValidMongoId(id)) {
    return NextResponse.json(
      { message: "Invalid record ID format." },
      { status: 400 }
    );
  }

  try {
    //Ratemlimit
    if (!(await applyRateLimit(userId, "read"))) {
      return new NextResponse("Too many requests. Please try again later.", {
        status: 429,
      });
    }

    //Find record
    const record = await getScoreRecordById(userId, id);
    if (!record) {
      return NextResponse.json(
        { message: "Record not found or access denied." },
        { status: 404 }
      );
    }
    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    return handleServerError(`GET /api/records/${id}`, error);
  }
}

//PUT Update record by ID
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const { userId } = await auth();
  const { id: recordId } = context.params;

  //check userid
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isValidMongoId(recordId)) {
    return NextResponse.json(
      { message: "Invalid record ID format." },
      { status: 400 }
    );
  }

  try {
    //CSRF Token and Origin Check
    const originError = verifyRequestOrigin(request);
    if (originError) return originError;
    const csrfError = await verifyCsrfToken(request);
    if (csrfError) return csrfError;
    //Rate limit
    if (!(await applyRateLimit(userId, "write"))) {
      return new NextResponse("Too many requests. Please try again later.", {
        status: 429,
      });
    }

    const existingRecord = await getScoreRecordById(userId, recordId);
    if (!existingRecord) {
      return NextResponse.json(
        { message: "Score record not found or access denied." },
        { status: 404 }
      );
    }

    // retrieve req body and validatte groupId
    const body = await request.json();
    const {
      gameTitle,
      playerNames,
      scoreItemNames,
      scores,
      numPlayers,
      numScoreItems,
      custom,
      groupId,
    } = body;

    // groupId validation
    let finalGroupId: string | undefined | null = existingRecord.groupId; // 既存の値をデフォルトとして設定

    // When there is groupId in a request
    if (groupId !== undefined) {
      if (groupId === null) {
        finalGroupId = null;
      } else if (typeof groupId === "string" && isValidMongoId(groupId)) {
        finalGroupId = groupId;
      } else {
        return NextResponse.json(
          { message: "Invalid groupId format. Must be a valid MongoDB ObjectId or null." },
          { status: 400 }
        );
      }
    }

    // valisate gameTitle
    const sanitizedTitle = sanitizeAndValidateString(
      gameTitle,
      MAX_TITLE_LENGTH,
      "gameTitle",
      allowedTitleRegex
    );
    if (sanitizedTitle.error)
      return NextResponse.json(
        { message: sanitizedTitle.error },
        { status: 400 }
      );

    // validate playerNames and logic to reuse ID
    if (!Array.isArray(playerNames) || playerNames.length > MAX_PLAYERS) {
      return NextResponse.json(
        { message: "Invalid playerNames data or too many players." },
        { status: 400 }
      );
    }
    const usedMemberIds = new Set<string>();
    const processedPlayerNames = [];

    //map existing player name
    const existingTempPlayerNameMap = new Map<string, string>();
    existingRecord.playerNames.forEach((player: any) => {
      if (player.memberId && player.memberId.startsWith("temp-player-")) {
        existingTempPlayerNameMap.set(player.name, player.memberId);
      }
    });

    const playerNamesCheck = checkPlayerNamesStructure(playerNames);
    if (playerNamesCheck.error)
      return NextResponse.json({
        message: playerNamesCheck.error,
        status: 400,
      });

    for (const player of playerNames) {
      // sanitise player name
      const sanitizedName = sanitizeAndValidateString(
        player.name,
        MAX_NAME_LENGTH,
        "playerName",
        allowedNameRegex
      );
      if (sanitizedName.error) {
        return NextResponse.json(
          { message: sanitizedName.error },
          { status: 400 }
        );
      }

      // logic for reusing player ID
      let memberIdToSave: string;
      const finalMemberId = player.memberId;
      const sanitizedPlayerName = sanitizedName.value!; // after sitizing

      if (finalMemberId && typeof finalMemberId === "string") {
        // existing or temporary ID
        memberIdToSave = finalMemberId;

        // dublication check
        if (usedMemberIds.has(memberIdToSave)) {
          return NextResponse.json(
            {
              message: `Duplicate player ID found for player: ${sanitizedPlayerName}. Each player can only appear once in a sheet.`,
            },
            { status: 400 }
          );
        }
        usedMemberIds.add(memberIdToSave);
      } else {
        // when memberId is null/undefined (temporary player)

        // reuse existing memberName
        if (existingTempPlayerNameMap.has(sanitizedPlayerName)) {
          memberIdToSave = existingTempPlayerNameMap.get(sanitizedPlayerName)!;
          // delete from the map to avoid duplication
          existingTempPlayerNameMap.delete(sanitizedPlayerName);
        } else {
          // new player or player that their name was changed
          memberIdToSave = `temp-player-${uuidv4()}`;
        }
      }

      processedPlayerNames.push({
        memberId: memberIdToSave,
        name: sanitizedPlayerName,
      });
    }

    // validate scoreItems
    if (
      !Array.isArray(scoreItemNames) ||
      scoreItemNames.length > MAX_SCORE_ITEMS
    ) {
      return NextResponse.json(
        { message: "Invalid scoreItemNames data or too many items." },
        { status: 400 }
      );
    }

    // score structure check
    const scoresCheck = checkScoresStructure(scores, numScoreItems, numPlayers);
    if (scoresCheck.error)
      return NextResponse.json({ message: scoresCheck.error }, { status: 400 });

    const sanitizedScoreItemNames = scoreItemNames.map((name: string) =>
      sanitizeAndValidateString(
        name,
        MAX_NAME_LENGTH,
        "scoreItemNames",
        allowedNameRegex
      )
    );
    if (sanitizedScoreItemNames.some((result: any) => result.error)) {
      return NextResponse.json(
        {
          message: sanitizedScoreItemNames.find((result: any) => result.error)
            ?.error,
        },
        { status: 400 }
      );
    }

    // validate numbers
    if (
      typeof numPlayers !== "number" ||
      numPlayers < 1 ||
      numPlayers > MAX_PLAYERS
    ) {
      return NextResponse.json(
        { message: "Invalid numPlayers." },
        { status: 400 }
      );
    }
    if (
      typeof numScoreItems !== "number" ||
      numScoreItems < 1 ||
      numScoreItems > MAX_SCORE_ITEMS
    ) {
      return NextResponse.json(
        { message: "Invalid numScoreItems." },
        { status: 400 }
      );
    }
    if (!Array.isArray(scores) || scores.length !== numScoreItems) {
      return NextResponse.json(
        { message: "Invalid scores data." },
        { status: 400 }
      );
    }

    const sanitizedScores = scores.map(
      (row: any[]) =>
        row.map((score) => (typeof score === "number" ? score : 0)) // number type check
    );

    // update data
    const updatedData = {
      gameTitle: sanitizedTitle.value,
      playerNames: processedPlayerNames,
      scoreItemNames: sanitizedScoreItemNames.map((name) => name.value!),
      scores: sanitizedScores,
      numPlayers,
      numScoreItems,
      groupId: finalGroupId,
      lastSavedAt: new Date(),
      custom: typeof custom === "boolean" ? custom : existingRecord.custom,
    };

    //Update DB
    const updatedRecord = await updateScoreRecord(
      userId,
      recordId,
      updatedData
    );

    if (!updatedRecord) {
      return NextResponse.json(
        { message: "Score record not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Record updated successfully!", record: updatedRecord },
      { status: 200 }
    );
  } catch (error) {
    return handleServerError(`PUT /api/records/${recordId}`, error);
  }
}

// Delete a record by ID
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  const { userId } = await auth();
  const { id: recordId } = context.params;
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isValidMongoId(recordId)) {
    return NextResponse.json(
      { message: "Invalid record ID format." },
      { status: 400 }
    );
  }

  try {
    //CSRF Token and Origin Check
    const originError = verifyRequestOrigin(request);
    if (originError) return originError;
    const csrfError = await verifyCsrfToken(request);
    if (csrfError) return csrfError;
    //Rate limit
    if (!(await applyRateLimit(userId, "write"))) {
      return new NextResponse("Too many requests. Please try again later.", {
        status: 429,
      });
    }

    const success = await deleteScoreRecord(userId, recordId);

    if (!success) {
      return NextResponse.json(
        { message: "Record not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Record deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return handleServerError(`DELETE /api/records/${recordId}`, error);
  }
}
