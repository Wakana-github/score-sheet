import express, { Request, Response, Router } from "express";
import ScoreRecord, { IScoreRecord } from "../../../server/models/score-record.ts";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";

interface AuthenticatedRequest extends Request {
  auth?: { userId: string };
}

const router = express.Router();

// GET /api/scores/my-records
// frtch records by user ID
router.get("/", ClerkExpressRequireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // search record with user ID
    const records: IScoreRecord[] = await ScoreRecord.find({ userId: userId }).sort({ lastSavedAt: -1 });
    res.status(200).json(records);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error fetching all user records:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE /api/scores/:id
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