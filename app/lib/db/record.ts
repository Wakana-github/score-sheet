import ScoreRecord, { IScoreRecord } from "./models/score-record"; 
import User from "./models/user.model";
import connectDB from "./score-sheet-db";
import {MAX_FREE_RECORDS,MAX_ACTIVE_RECORDS, PAGENATION_LIMIT, MAX_PLAYERS, MAX_SCORE_ITEMS} from "../constants"

/*
* This file is to help DB intreraction for Record CRUD actions.
*
* */

// function to create new record (for POST) (POST用)
export async function createScoreRecord(
    userId: string, 
    recordData: any, 
    groupId?: string
): Promise<{ record: IScoreRecord, maxRecords: number, isActiveUser: boolean } | null> {
    await connectDB();

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
        throw new Error("User not found in DB.");
    }

    const recordCount = await ScoreRecord.countDocuments({ userId: userId });
    const isActiveUser = user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing";
    const maxRecords = isActiveUser ? MAX_ACTIVE_RECORDS : MAX_FREE_RECORDS;

    if (recordCount >= maxRecords) {
        // throw error when records over the limit 
        throw new Error(JSON.stringify({
            status: 403,
            message: `You've reached the record limit of ${maxRecords}.`,
            isActiveUser: isActiveUser,
        }));
    }

    const newRecord = {
        ...recordData,
        userId: userId,
        groupId: groupId,
        createdAt: new Date(),
        lastSavedAt: new Date(),
    };
    const record = await ScoreRecord.create(newRecord);
    
    return { record: JSON.parse(JSON.stringify(record)), maxRecords, isActiveUser };
}

// Function to retrieve all user records(for GET /records)
export async function getScoreRecords(
    userId: string, 
    page: number = 1, 
    keyword?: string
): Promise<{ records: IScoreRecord[], totalRecords: number, currentPage: number, limit: number, isActiveUser: boolean, maxRecords: number } | null> {
    await connectDB();

    //finf the userId
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
        throw new Error("User not found in DB.");
    }

    const limit = PAGENATION_LIMIT;
    const skip = (page - 1) * limit;

    const isActiveUser = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
    const maxRecords = isActiveUser ? MAX_ACTIVE_RECORDS : MAX_FREE_RECORDS;
    
    // Build base query for filtering
    const baseQuery: any = { userId: userId };
    if (keyword && keyword.trim()) {
        baseQuery.gameTitle = { $regex: keyword.trim(), $options: 'i' };
    }
try {
    // number of documents (after filtered)
    const totalFilteredRecords = await ScoreRecord.countDocuments(baseQuery);
    
    let records: IScoreRecord[] = [];
    let queryLimit = limit;
    
    // Apply pagination for records
    if (!isActiveUser) {
        records = await ScoreRecord.find(baseQuery) 
        .sort({ lastSavedAt: -1 })
        .skip(skip)
        .limit(limit);
    } else {
        // limit pagination for non active user
        queryLimit = Math.min(limit, MAX_FREE_RECORDS - skip);
        if (skip >= MAX_FREE_RECORDS || queryLimit <= 0) {
            records = [];// no record exist after max limmit
            
    } else {
        // Apply standard pagination for inactive users
        records = await ScoreRecord.find(baseQuery)
        .sort({ lastSavedAt: -1 })
        .skip(skip)
        .limit(queryLimit);
    }
    }
    
    const effectiveTotalRecords = isActiveUser
        ? totalFilteredRecords
        : Math.min(totalFilteredRecords, MAX_FREE_RECORDS);

    return {
        records: JSON.parse(JSON.stringify(records)),
        totalRecords: effectiveTotalRecords,
        currentPage: page,
        limit,
        isActiveUser,
        maxRecords,
    };
    }catch (dbError) {
        console.error("DB Error in get score records:", dbError); 
        throw dbError; 
    }
}


// Retrieve specific records (GET /records/:id用)
export async function getScoreRecordById(userId: string, recordId: string): Promise<IScoreRecord | null> {
    await connectDB(); //connectDB
    
    //find records the logged-in user saved
    const record = await ScoreRecord.findOne({
        _id: recordId,
        userId: userId,
    });
    
    return record ? JSON.parse(JSON.stringify(record)) : null;
}

// Function to update records (for PUT /records/:id)
export async function updateScoreRecord(userId: string, recordId: string, updatedData: any): Promise<IScoreRecord | null> {
    await connectDB();
    
    const updatedRecord = await ScoreRecord.findOneAndUpdate(
        { _id: recordId, userId: userId },
        updatedData,
        { new: true, runValidators: true }
    );

    return updatedRecord ? JSON.parse(JSON.stringify(updatedRecord)) : null;
}

// Function to delete records (for DELETE /records/:id)
export async function deleteScoreRecord(userId: string, recordId: string): Promise<boolean> {
    await connectDB();
    
    const result = await ScoreRecord.deleteOne({
        _id: recordId,
        userId: userId,
    });
    
    return result.deletedCount > 0;
}