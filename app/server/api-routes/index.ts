import express, { Request, Response, Router } from "express";
import ScoreRecord, { IScoreRecord, IScoreRecordCreation }  from "../models/score-record.ts"; // ScoreRecord モデルをインポート

const router = express.Router();

// --- Define API End Pont ---

// GET /api/scores
// get all score records, sord by recent date
router.get("/", async (req: Request, res: Response) => {
  try {
    const records = await ScoreRecord.find().sort({ lastSavedAt: -1 });
    res.status(200).json(records);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error fetching records:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST /api/scores
// save new record, or update existed record
router.post("/", async (req: Request<object, object, IScoreRecordCreation>, res: Response) => {
  try {
    const newRecordData = req.body;
    const record: IScoreRecord = await ScoreRecord.create(newRecordData);
    res.status(201).json({ message: "Record saved successfully", record });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error saving new record:", error);
     if ('code' in error && error.code === 11000) {
        return res.status(409).json({
          message: "A record with this ID already exists. Please use PUT to update.",
          error: error.message,
        });
      }

      res.status(500).json({ message: "Server error", error: error.message });
    } else {
      // unknown error
      console.error("Unknown error:", error);
      res.status(500).json({ message: "An unknown server error occurred." });
    }
  }
});


// GET /api/scores/:id
// / get a score record by ID
router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const record = await ScoreRecord.findOne({ id: req.params.id });
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.status(200).json(record);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error fetching single record:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PUT / update an existing record by ID
router.put("/:id", async (req: Request<{ id: string }, object, IScoreRecordCreation>, res: Response) => {
  try {
    const recordId = req.params.id;
    const updatedData = req.body;

    const updatedRecord: IScoreRecord | null = await ScoreRecord.findOneAndUpdate(
      { id: recordId },
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

// DELETE /api/scores/:id
//  delete a score record by IDす。
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const result = await ScoreRecord.deleteOne({ id: req.params.id });
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
