import express, { Request, Response, Router } from "express";
import ScoreRecord, { IScoreRecord } from "../models/score-record.ts";
import User from "../models/user.modal.ts";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { AuthenticatedRequest } from "../types/express.d";

const router = express.Router();

const MAX_FREE_RECORDS = 5;
const MAX_ACTIVE_RECORDS = 500;
const PAGENATION_LIMIT = 10;

// --- Define API End Pont ---

// POST /api/scores/records
// save new record, or update existed record
router.post(
  "/",
  ClerkExpressRequireAuth(),
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
      const { gameTitle, playerNames, scoreItemNames, scores, numPlayers, numScoreItems } = req.body;

      //Create API object
      const newRecordData = {
        gameTitle,
        playerNames,
        scoreItemNames,
        scores,
        numPlayers,
        numScoreItems,
        userId: userId,
        createdAt: new Date(),
        lastSavedAt: new Date(),
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

      // search record with user ID
      let records: IScoreRecord[];
      const isActiveUser = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
      const totalRecords = await ScoreRecord.countDocuments({ userId: userId });
      const maxRecords = isActiveUser ? MAX_ACTIVE_RECORDS : MAX_FREE_RECORDS;

      if (isActiveUser) {
        records = await ScoreRecord.find({ userId: userId })
          .sort({ lastSavedAt: -1 })
          .skip(skip)
          .limit(limit);
      } else {
        // limit number of records to retrieve for inactive user
        records = await ScoreRecord.find({ userId: userId })
          .sort({ lastSavedAt: -1 })
          .limit(MAX_FREE_RECORDS);
      }

      res.status(200).json({
      records,
      totalRecords,
      currentPage: page,
      limit,
      isActiveUser,
      maxRecords,
    });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error fetching all user records:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// GET /api/scores/records/:id
// / get a score record by ID
router.get(
  "/:id",
  ClerkExpressRequireAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      //check authorisation
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const record = await ScoreRecord.findOne({
        _id: req.params.id,
        userId: userId,
      });
      if (!record) {
        return res
          .status(404)
          .json({ message: "Record not found or access denied." });
      }
      res.status(200).json(record);
    } catch (error: unknown) {
      console.error("Error fetching single record:", error);
      res.status(500).json({ message: "Failed to fetch score record." });
    }
  }
);

// PUT /api/scores/records/:id
// PUT / update an existing record by ID
router.put(
  "/:id",
  ClerkExpressRequireAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      //check authorisation
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const recordId = req.params.id;
      const updatedData = { ...req.body, lastSavedAt: new Date() };

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
          .json({
            message: "Failed to update score record.",
            error: error.message,
          });
      }
    }
  }
);

// DELETE /api/scores/records/:id
//  delete a score record by ID
router.delete(
  "/:id",
  ClerkExpressRequireAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      //chsrk authorisation
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
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
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

export default router;
