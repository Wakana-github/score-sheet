import express, { Request, Response, Router } from "express";
import rateLimit from "express-rate-limit";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";
import Group from "../models/group.ts"; // Adjust the path if needed
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { AuthenticatedRequest } from "../types/express.d"; // Assuming you have this type
import {
  allowedNameRegex,
  allowedGroupRegex,
  MAX_GROUP_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_GROUPS,
  MAX_NUM_MEMBERS,
} from "../../lib/constants.ts";

// Initialize JSDOM and pass it to DOMPurify
const { window } = new JSDOM("");
const domPurify = DOMPurify(window as any);

interface SanitizeResult {
  error?: string;
  value?: string;
}

const router = express.Router();

// Helper function to sanitize and validate strings
const sanitizeAndValidateString = (
  input: string,
  maxLength: number,
  fieldName: string,
  regex: RegExp 
): SanitizeResult => {
  if (typeof input !== "string" || input.trim() === "") {
    return { error: `${fieldName} cannot be empty.` };
  }
  const trimmedInput = input.trim();
  // Count visible characters before sanitizing
  const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
  const realLength = [...segmenter.segment(trimmedInput)].length;
  if (realLength > maxLength) {
    return { error: `${fieldName} cannot exceed ${maxLength} characters.` };
  }
  // validation by regex
  if (!regex.test(trimmedInput)) {
    return { error: `${fieldName} contains invalid characters.` };
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

// --- Define API Endpoints ---

// POST /api/groups
// Create a new group
router.post(
  "/",
  ClerkExpressRequireAuth(),
  apiLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Limit number of records 
      const groupCount = await Group.countDocuments({ userId: userId }); //count number of groups by userId
      //check  number of records
      if (groupCount >= MAX_GROUPS) {
        return res.status(403).json({ 
          message: `Group limit reached. You can only create up to ${MAX_GROUPS} groups.` 
        });
      }

      //fetch data from req.body
      const { groupName, members } = req.body;

      // Validate and sanitize groupName
      const sanitizedGroupName = sanitizeAndValidateString(
        groupName,
        MAX_GROUP_NAME_LENGTH,
        "groupName",
         allowedGroupRegex
      );
      if (sanitizedGroupName.error) {
        return res.status(400).json({ message: sanitizedGroupName.error });
      }

      // Validate and sanitize members array (number of members)
      if (!Array.isArray(members) || members.length === 0 ||members.length > MAX_NUM_MEMBERS) {
        return res
          .status(400)
          .json({ message: `Member count must be between 1 and ${MAX_NUM_MEMBERS}.` });
      }

      // Validate and sanitize member's name
      const sanitizedMembers = members.map((name: string) =>
        sanitizeAndValidateString(name, MAX_NAME_LENGTH, "memberName", allowedNameRegex)
      );
      if (sanitizedMembers.some((result: SanitizeResult) => result.error)) {
        return res
          .status(400)
          .json({
            message: sanitizedMembers.find(
              (result: SanitizeResult) => result.error
            )?.error,
          });
      }
      const finalMembers = sanitizedMembers.map((result) => result.value);

      // === Create and save group object ===
      const newGroup = await Group.create({
        groupName: sanitizedGroupName.value,
        members: finalMembers,
        userId: userId,
      });

      res.status(201).json({ message: "Group created successfully", group: newGroup });
    } catch (error: any) {
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// GET /api/groups
// Get all groups for a user
router.get(
  "/",
  ClerkExpressRequireAuth(),
  apiLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      // Find groups
      const groups = await Group.find({ userId: userId }).sort({
        createdAt: -1,
      });
      res.status(200).json(groups);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// GET /api/groups/:id
// Get a single group by ID
router.get(
  "/:id",
  ClerkExpressRequireAuth(),
  apiLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const group = await Group.findOne({
        _id: req.params.id,
        userId: userId,
      });
      if (!group) {
        return res.status(404).json({ message: "Group not found." });
      }
      res.status(200).json(group);
    } catch (error: any) {
      console.error("Error fetching group:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// PUT /api/groups/:id
// Update a group by ID
router.put(
  "/:id",
  ClerkExpressRequireAuth(),
  apiLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { groupName, members } = req.body;


      // Validate and sanitize groupName
      const sanitizedGroupName = sanitizeAndValidateString(
        groupName,
        MAX_GROUP_NAME_LENGTH,
        "groupName",
        allowedGroupRegex
      );

      if (sanitizedGroupName.error) {
        return res.status(400).json({ message: sanitizedGroupName.error });
      }

      // Validate and sanitize members array
      if (!Array.isArray(members) || members.length === 0 || members.length > MAX_NUM_MEMBERS) {
        return res
          .status(400)
          .json({ message: `Member count must be between 1 and ${MAX_NUM_MEMBERS}.` });
      }

      // Validate and sanitize member's name
      const sanitizedMembers = members.map((name: string) =>
        sanitizeAndValidateString(name, MAX_NAME_LENGTH, "memberName", allowedNameRegex)
      );
      if (sanitizedMembers.some((result: SanitizeResult) => result.error)) {
        return res.status(400).json({
            message: sanitizedMembers.find(
              (result: SanitizeResult) => result.error
            )?.error,
          });
      }
      const finalMembers = sanitizedMembers.map((result) => result.value);

      

      //update a record
      const updatedGroup = await Group.findOneAndUpdate(
        { _id: req.params.id, userId: userId },
        {
          groupName: sanitizedGroupName.value,
          members: finalMembers,
        },
        { new: true, runValidators: true }
      );
      if (!updatedGroup) {
        return res
          .status(404)
          .json({ message: "Group not found or access denied." });
      }

      res.status(200).json({ message: "Group updated successfully", group: updatedGroup });
    } catch (error: any) {
      console.error("Error updating group:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// DELETE /api/groups/:id
// Delete a group by ID
router.delete(
  "/:id",
  apiLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const result = await Group.deleteOne({
        _id: req.params.id,
        userId: userId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Group not found or access denied." });
      }

      res.status(200).json({ message: "Group deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting group:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

export default router;
