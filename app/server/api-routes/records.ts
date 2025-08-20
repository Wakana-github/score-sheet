import express, { Request, Response, Router } from "express";
import ScoreRecord, { IScoreRecord } from "../models/score-record.ts";
import User from "../models/user.modal.ts";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { AuthenticatedRequest } from "../types/express.d";


const router = express.Router();

const MAX_FREE_RECORDS = 5;
const MAX_ACTIVE_RECORDS = 6;

// --- Define API End Pont ---

// POST /api/scores/records
// save new record, or update existed record
router.post("/", ClerkExpressRequireAuth(), async (req: AuthenticatedRequest, res: Response) => {
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
    let maxRecords = MAX_FREE_RECORDS;
    let isActiveUser = false;
    if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') {
      maxRecords = MAX_ACTIVE_RECORDS;
      isActiveUser = true;
    }
     if (recordCount >= maxRecords) {
      return res.status(403).json({ 
        message: `You've reached the record limit of ${maxRecords}.
To save new scores, please delete some of your existing records.`,
        isActiveUser: isActiveUser
       });
    }

    //Create API object
   const newRecordData = {
      ...req.body,
      userId: userId,
      createdAt: new Date(),
      lastSavedAt: new Date(),
    } as any;

    const record: IScoreRecord = await ScoreRecord.create(newRecordData);
    res.status(201).json({ message: "Record saved successfully", record });
  }  catch (error) {
    if (error instanceof Error) {
      console.error("Error saving new record:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    } else {
      console.error("Unknown error:", error);
      res.status(500).json({ message: "An unknown server error occurred." });
    }
  }
});


// GET /api/scores/records
// frtch all records by user ID
router.get("/", ClerkExpressRequireAuth(), async (req: AuthenticatedRequest, res: Response) => {
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

// search record with user ID
    let records: IScoreRecord[];
    if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') {
      records = await ScoreRecord.find({ userId: userId }).sort({ lastSavedAt: -1 }).limit(MAX_ACTIVE_RECORDS);
    }else {
      // limit number of records to retrieve for inactive user
      records = await ScoreRecord.find({ userId: userId }).sort({ lastSavedAt: -1 }).limit(MAX_FREE_RECORDS);
    }

    res.status(200).json(records);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error fetching all user records:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// GET /api/scores/records/:id
// / get a score record by ID
router.get("/:id", ClerkExpressRequireAuth(), async (req: AuthenticatedRequest, res: Response) => {

  try {
    //check authorisation
    const userId = req.auth?.userId;
     if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

    const record = await ScoreRecord.findOne({ id: req.params.id, userId: userId });
    if (!record) {
      return res.status(404).json({ message: "Record not found or access denied." });
    }
    res.status(200).json(record);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error fetching single record:", err);
    res.status(500).json({ message: "Failed to update score record.", error: err.message });
  }
});


// PUT /api/scores/records/:id
// PUT / update an existing record by ID
router.put("/:id", ClerkExpressRequireAuth(),  async (req: AuthenticatedRequest, res: Response) => {
  try {
    //check authorisation
    const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
    const recordId = req.params.id;
    const updatedData = req.body;

    const updatedRecord: IScoreRecord | null = await ScoreRecord.findOneAndUpdate(
      { id: recordId, userId: userId },
      { ...updatedData, lastSavedAt: new Date() },
      { new: true, runValidators: true } // 更新時もバリデーションを実行
    );

    if (!updatedRecord) {
      return res.status(404).json({ message: "Score record not found." });
    }

    res.status(200).json({ message: "Record updated successfully!", record: updatedRecord });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error updating score record:", error);
      res.status(500).json({ message: "Failed to update score record.", error: error.message });
    }
  }
});

// DELETE /api/scores/records/:id
//  delete a score record by ID
router.delete("/:id", ClerkExpressRequireAuth(),  async (req: AuthenticatedRequest, res: Response) => {
    try {
      //chsrk authorisation
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await ScoreRecord.deleteOne({ id: req.params.id, userId: userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.status(200).json({ message: "Record deleted successfully" });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error deleting record:", error);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;