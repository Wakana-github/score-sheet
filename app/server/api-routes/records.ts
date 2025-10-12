import express, { Request, Response, Router } from "express";
import mongoose from "mongoose";
import rateLimit from 'express-rate-limit';
import ScoreRecord, { IScoreRecord, IPlayer } from "../models/score-record.ts";
import User from "../models/user.model.ts";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { AuthenticatedRequest } from "../types/express.d";
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { v4 as uuidv4 } from 'uuid';

// Initialize JSDOM and pass it to DOMPurify
const { window } = new JSDOM('');
const domPurify = DOMPurify(window as any);

// Define the return type of the helper function
interface SanitizeResult {
  error?: string;
  value?: string;
}

const router = express.Router();

//constants : must be same as lib/constatns.ts
const MAX_TITLE_LENGTH = 35;
const MAX_NAME_LENGTH = 30;
const MAX_FREE_RECORDS = 5;
const MAX_ACTIVE_RECORDS = 500;
const PAGENATION_LIMIT = 10;


// Helper function to validate MongoDB ObjectId format 
const isValidMongoId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id);
};

// Helper function to sanitize and validate strings
const sanitizeAndValidateString = (input: string, maxLength: number, fieldName: string): SanitizeResult => {
  if (typeof input !== 'string') {
    return { error: `Invalid type for ${fieldName}.` };
  }

  const trimmedInput = input.trim();

  // Count visible characters before sanitizing 
  const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
  const realLength = [...segmenter.segment(trimmedInput)].length;
  if (realLength > maxLength) {
    return { error: `${fieldName} cannot exceed ${maxLength} characters.` };
  }

 // Sanitization with DOMPurify is performed after the character count check
  const sanitized = domPurify.sanitize(trimmedInput);

  return { value: sanitized };
};

// Rate limiting settings
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // over 5 minutes
  max: 100, // allow a maximum of 100 requests
  message: "Too many requests in a short time, please try again later.",
});


// --- Define API End Pont ---

// POST /api/scores/records
// save new record, or update existed record
router.post(
  "/",
  ClerkExpressRequireAuth(),
  apiLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.auth?.userId; // fetch userId from req.auth
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Find user
      const user = await User.findOne({ clerkId: userId });
      if (!user) {
        return res.status(404).json({ message: "User not found in." });
      }

      // count existed numnber of records
      const recordCount = await ScoreRecord.countDocuments({ userId: userId });

      // set maximum number of records depend on the subscription status
      const isActiveUser = user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing";
      const maxRecords = isActiveUser ? MAX_ACTIVE_RECORDS : MAX_FREE_RECORDS;

      if (recordCount >= maxRecords) {
        return res.status(403).json({
          message: `You've reached the record limit of ${maxRecords}.To save new scores, please delete some of your existing records.`,
          isActiveUser: isActiveUser,
        });
      }

      //fetch data from req.body
      const { gameTitle, playerNames, scoreItemNames, scores, numPlayers, numScoreItems, custom, groupId, ...rest } = req.body;
    
       // === Validation and sanitization using DOMPurify ===
      const sanitizedTitle = sanitizeAndValidateString(gameTitle, MAX_TITLE_LENGTH, 'gameTitle');
      if (sanitizedTitle.error) return res.status(400).json({ message: sanitizedTitle.error });

      // Validate that playerNames is an array
      if (!Array.isArray(playerNames)) {
        return res.status(400).json({ message: "Invalid playerNames data." });
      }

      // メンバーIDの重複をチェックするためのSet
      const usedMemberIds = new Set<string>();
      const processedPlayerNames = [];
      
      for (const player of playerNames) {
        const isMemberIdValid = (typeof player.memberId === 'string' || player.memberId === null || typeof player.memberId === 'undefined'); 
          if (typeof player !== 'object' || player === null || typeof player.name !== 'string' || !isMemberIdValid) {
               return res.status(400).json({ message: "Invalid structure for playerNames element." });
          }
          // sanitize and validate player name
          const sanitizedName = sanitizeAndValidateString(player.name, MAX_NAME_LENGTH, 'playerName');
          if (sanitizedName.error) {
              return res.status(400).json({ message: sanitizedName.error });
          }

          const finalMemberId = player.memberId;
          let memberIdToSave: string;
          if (finalMemberId && typeof finalMemberId === 'string') {
             memberIdToSave = finalMemberId;
            // CHECK if memberId exist
          if (usedMemberIds.has(memberIdToSave)) {
            return res.status(400).json({ 
              message: `Duplicate member ID found for player: ${sanitizedName.value}. Each member can only appear once in a sheet.` 
            });
          }
          usedMemberIds.add(memberIdToSave);
          } else {
            memberIdToSave = `temp-player-${uuidv4()}`; 
          }

          processedPlayerNames.push({
              memberId: memberIdToSave,
              name: sanitizedName.value,
          });
      }

      // Validate that scoreItemNames is an array
      if (!Array.isArray(scoreItemNames)) {
        return res.status(400).json({ message: "Invalid scoreItemNames data." });
      }
      const sanitizedScoreItemNames = scoreItemNames.map((name: string) => sanitizeAndValidateString(name, MAX_NAME_LENGTH, 'scoreItemNames'));
      // Explicitly specify the type for the `find` method's callback
      if (sanitizedScoreItemNames.some((result: SanitizeResult) => result.error)) {
        return res.status(400).json({ message: sanitizedScoreItemNames.find((result: SanitizeResult) => result.error)?.error });
      }

      // === Validate numerical data ===
      if (typeof numPlayers !== 'number' || numPlayers < 1 || numPlayers > 10) {
        return res.status(400).json({ message: "Invalid numPlayers." });
      }
      if (typeof numScoreItems !== 'number' || numScoreItems < 1 || numScoreItems > 15) {
        return res.status(400).json({ message: "Invalid numScoreItems." });
      }
      if (!Array.isArray(scores) || scores.length !== numScoreItems) {
        return res.status(400).json({ message: "Invalid scores data." });
      }
      const sanitizedScores = scores.map((row: any[]) => 
        row.map(score => typeof score === 'number' ? score : 0) // Check if it's numeric
      );

      // === Create and save data object ===
      const newRecordData = {
        gameTitle: sanitizedTitle.value,
        playerNames: processedPlayerNames,
        scoreItemNames: sanitizedScoreItemNames.map(name => name.value),
        scores: sanitizedScores,
        numPlayers,
        numScoreItems,
        userId: userId,
        groupId: typeof groupId === 'string' ? groupId : undefined,
        createdAt: new Date(),
        lastSavedAt: new Date(),
        custom: typeof custom === 'boolean' ? custom : false, 
      };
      const record: IScoreRecord = await ScoreRecord.create(newRecordData);

      res.status(201).json({ message: "Record saved successfully", record });
    } catch (error) {
      console.error("Error saving new record:", error);
      res.status(500).json({ message: "An unknown server error occurred." });
    }
  }
);


// GET /api/scores/records
// frtch all records by user ID
router.get(
  "/",
   apiLimiter,
  ClerkExpressRequireAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      // Find a user
      const user = await User.findOne({ clerkId: userId });
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      //pagination parameter query
      const page = parseInt(req.query.page as string) || 1;
      const limit = PAGENATION_LIMIT; // number of records per page
      const skip = (page - 1) * limit; // calculate number of records to skip

      //フィルタリングキーワードを取得
      const filterKeyword = req.query.keyword as string | undefined;
      //フィルタリングのベースクエリを構築
      const baseQuery: any = { userId: userId };
      if (filterKeyword && filterKeyword.trim()) {
          // gameTitle がキーワードを含むように $regex を使用
          // 'i' オプションで大文字/小文字を区別しない検索
          baseQuery.gameTitle = { $regex: filterKeyword.trim(), $options: 'i' };
      }

      // search record with user ID
      let records: IScoreRecord[];
      const isActiveUser = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
      const totalFilteredRecords = await ScoreRecord.countDocuments(baseQuery);
      const maxRecords = isActiveUser ? MAX_ACTIVE_RECORDS : MAX_FREE_RECORDS;

      if (isActiveUser) {
        records = await ScoreRecord.find(baseQuery) 
          .sort({ lastSavedAt: -1 })
          .skip(skip)
          .limit(limit);
      } else {
        // limit number of records to retrieve for inactive user
        records = await ScoreRecord.find(baseQuery)
          .sort({ lastSavedAt: -1 })
          .limit(MAX_FREE_RECORDS);
      }

      const sanitizedRecords = records.map(record => ({
        ...record.toObject(),
        gameTitle: domPurify.sanitize(record.gameTitle),
        playerNames: record.playerNames.map((player: IPlayer) => ({
            memberId: player.memberId,
            name: domPurify.sanitize(player.name),
        })),
        scoreItemNames: record.scoreItemNames.map(name => domPurify.sanitize(name)),
      }));

      res.status(200).json({
      records: sanitizedRecords,
      totalRecords: totalFilteredRecords, //フィルタリング後の総数を返す
      currentPage: page,
      limit,
      isActiveUser,
      maxRecords:isActiveUser ? MAX_ACTIVE_RECORDS : MAX_FREE_RECORDS,
    });
    console.log("Received GET query for userId:", userId, "Keyword:", filterKeyword);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error fetching all user records:", err);
      res.status(500).json({ message: "An unexpected server error occurred."});
    }
  }
);

// GET /api/scores/records/:id
// / get a score record by ID
router.get(
  "/:id",
   apiLimiter,
  ClerkExpressRequireAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      //check authorisation
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      //Check Id format
      if (!isValidMongoId(req.params.id)) {
        return res.status(400).json({ message: "Invalid record ID format." });
      }

      const record = await ScoreRecord.findOne({
        _id: req.params.id,
        userId: userId,
      });
      if (!record) {
        return res.status(404).json({ message: "Record not found or access denied." });
      }

      // 💡 修正: レスポンスをサニタイズする
      const sanitizedRecord = {
          ...record.toObject(),
          gameTitle: domPurify.sanitize(record.gameTitle),
          playerNames: record.playerNames.map((player: IPlayer) => ({
              memberId: player.memberId,
              name: domPurify.sanitize(player.name),
          })),
          scoreItemNames: record.scoreItemNames.map((name: string) => domPurify.sanitize(name)),
      };



      res.status(200).json(sanitizedRecord);
    } catch (error: unknown) {
      console.error("Error fetching single record:", error);
      res.status(500).json({ message: "An unexpected server error occurred." });
    }
  }
);

// PUT /api/scores/records/:id
// PUT / update an existing record by ID
router.put(
  "/:id",
  apiLimiter,
  ClerkExpressRequireAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      //check authorisation
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const recordId = req.params.id;

      //Check Id format
      if (!isValidMongoId(recordId)) {
        return res.status(400).json({ message: "Invalid record ID format." });
      }

     // Only get the necessary data from the request body
      const { gameTitle, playerNames, scoreItemNames, scores, numPlayers, numScoreItems, custom, groupId } = req.body;

      // === Add validation and sanitization using DOMPurify===
      const sanitizedTitle = sanitizeAndValidateString(gameTitle, MAX_TITLE_LENGTH, 'gameTitle');
      if (sanitizedTitle.error) return res.status(400).json({ message: sanitizedTitle.error });

      // Validate that playerNames is an array
      if (!Array.isArray(playerNames)) {
        return res.status(400).json({ message: "Invalid playerNames data." });
      }


       //validate player object
      const usedMemberIds = new Set<string>();
      const processedPlayerNames = [];
      for (const player of playerNames) {
        const isMemberIdValid = (typeof player.memberId === 'string' || player.memberId === null|| typeof player.memberId === 'undefined'); 
         if (typeof player !== 'object' || player === null || typeof player.name !== 'string' || !isMemberIdValid) {
          return res.status(400).json({ message: "Invalid structure for playerNames element." });
        }
      //validate player name
      const sanitizedName = sanitizeAndValidateString(player.name, MAX_NAME_LENGTH, 'playerName');
      if (sanitizedName.error) {
         return res.status(400).json({ message: sanitizedName.error });
      }

      const finalMemberId = player.memberId;
      let memberIdToSave: string;

      if (finalMemberId && typeof finalMemberId === 'string') {
          // when memberId exists
          memberIdToSave = finalMemberId;
          // check if memberIds are duplicated
          if (usedMemberIds.has(memberIdToSave)) {
            return res.status(400).json({ 
              message: `Duplicate player ID found for player: ${sanitizedName.value}. Each player can only appear once in a sheet.` 
            });
          }
          usedMemberIds.add(memberIdToSave);
          
        } else {
          // when there is no existing memberId (null/undefined)
          memberIdToSave = `temp-player-${uuidv4()}`; 
        }

      processedPlayerNames.push({
         memberId: memberIdToSave,
         name: sanitizedName.value,
      })  
     }


      // Validate that scoreItemNames is an array
      if (!Array.isArray(scoreItemNames)) {
        return res.status(400).json({ message: "Invalid scoreItemNames data." });
      }
      const sanitizedScoreItemNames = scoreItemNames.map((name: string) => sanitizeAndValidateString(name, MAX_NAME_LENGTH, 'scoreItemNames'));
      if (sanitizedScoreItemNames.some((result: SanitizeResult) => result.error)) {
        return res.status(400).json({ message: sanitizedScoreItemNames.find((result: SanitizeResult) => result.error)?.error });
      }

      // === Validate numerical data  ===
      if (typeof numPlayers !== 'number' || numPlayers < 1 || numPlayers > 10) {
        return res.status(400).json({ message: "Invalid numPlayers." });
      }
      if (typeof numScoreItems !== 'number' || numScoreItems < 1 || numScoreItems > 15) {
        return res.status(400).json({ message: "Invalid numScoreItems." });
      }
      if (!Array.isArray(scores) || scores.length !== numScoreItems) {
        return res.status(400).json({ message: "Invalid scores data." });
      }
      const sanitizedScores = scores.map((row: any[]) =>
        row.map(score => typeof score === 'number' ? score : 0) // 数値であることを確認
      );

      // Explicitly specify the fields to be updated
      const updatedData = {
        gameTitle: sanitizedTitle.value,
        playerNames: processedPlayerNames,
        scoreItemNames: sanitizedScoreItemNames.map(name => name.value),
        scores: sanitizedScores,
        numPlayers,
        numScoreItems,
        groupId: typeof groupId === 'string' ? groupId : undefined,
        lastSavedAt: new Date(),
        custom: typeof custom === 'boolean' ? custom : false, 
      };



      //update a record
      const updatedRecord: IScoreRecord | null =
        await ScoreRecord.findOneAndUpdate(
          { _id: recordId, userId: userId },
          updatedData,
          { new: true, runValidators: true } // re-validate when update
        );

      if (!updatedRecord) {
        return res.status(404).json({ message: "Score record not found." });
      }

      res.status(200).json({
          message: "Record updated successfully!",
          record: updatedRecord,
        });
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error updating score record:", error);
        res
          .status(500)
          .json({ message: "An unexpected server error occurred."});
      }
    }
  }
);

// DELETE /api/scores/records/:id
//  delete a score record by ID
router.delete(
  "/:id",
  apiLimiter,
  ClerkExpressRequireAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      //chsrk authorisation
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      //Id format check
      if (!isValidMongoId(req.params.id)) {
         return res.status(400).json({ message: "Invalid record ID format." });
        }

      const result = await ScoreRecord.deleteOne({
        _id: req.params.id,
        userId: userId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Record not found" });
      }
      res.status(200).json({ message: "Record deleted successfully" });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error deleting record:", error);
      res.status(500).json({  message: "An unexpected server error occurred." });
    }
  }
);

export default router;
