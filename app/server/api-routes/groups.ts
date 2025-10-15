
import express, { Request, Response, Router } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";
import Group from "../models/group.ts"; 
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { AuthenticatedRequest } from "../types/express.d"; 
import { handleServerError } from "../lib/db/errorHandler.ts";
import {
  allowedNameRegex,
  allowedGroupRegex,
  MAX_GROUP_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_GROUPS,
  MAX_NUM_MEMBERS,
} from "../../lib/constants.ts";


/*API routes for managing user groups and members. It handles CRUD operations.
* Key features: Authentication & Authorization, Input Validation & Sanitization,
* Group Limits, and Rate Limiting
*/


// Initialize JSDOM and pass it to enable DOMPurify functionality 
// DOMPurify is used to sanitize all user-supplied input (names) against XSS attacks.
const { window } = new JSDOM("");
const domPurify = DOMPurify(window as any);

// Interface for member data structure received from the client
interface IncomingMember {
    memberId: string;
    name: string;
}

interface SanitizeResult {
  error?: string;
  value?: string;
}
const router = express.Router();

// Helper function to validate MongoDB ObjectId format 
const isValidMongoId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

// Helper function to sanitise and validate strings
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


  // Count visible characters before sanitising (especially for Japanese and multi-byte characters)
  const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
  const realLength = [...segmenter.segment(trimmedInput)].length;

  // Check Length Limit 
  if (realLength > maxLength) {
    return { error: `${fieldName} cannot exceed ${maxLength} characters.` };
  }
  //  Check Allowed Characters
  if (!regex.test(trimmedInput)) {
    return { error: `${fieldName} contains invalid characters.` };
  }
  // Sanitisation with DOMPurify :Strip dangerous HTML/scripts 
  const sanitized = domPurify.sanitize(trimmedInput);
  return { value: sanitized };
};

// Rate limiting settings 
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // over 5 minutes
  max: 100, // allow a maximum of 100 requests
  message: "Too many requests, please try again later.",
});

//-----------------------------
// POST /api/groups - Create a new group
//=------------------------------
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

      // Limit the total number of groups per user
      const groupCount = await Group.countDocuments({ userId: userId }); //count number of groups by userId
      //check  number of records
      if (groupCount >= MAX_GROUPS) {
        return res.status(403).json({ 
          message: `Group limit reached. You can only create up to ${MAX_GROUPS} groups.` 
        });
      }

      //fetch data from req.body
      const { groupName, members } = req.body;

      // Validate and sanitise groupName
      const sanitizedGroupName = sanitizeAndValidateString(
        groupName,
        MAX_GROUP_NAME_LENGTH,
        "groupName",
         allowedGroupRegex
      );
      if (sanitizedGroupName.error) {
        return res.status(400).json({ message: sanitizedGroupName.error });
      }

      // Validate and sanitise members array (Size Check)
      if (!Array.isArray(members) || members.length === 0 ||members.length > MAX_NUM_MEMBERS) {
        return res
          .status(400)
          .json({ message: `Member count must be between 1 and ${MAX_NUM_MEMBERS}.` });
      }

      const memberIdSet = new Set<string>();
      const finalMembers: { memberId: string; name: string }[] = [];

      // Loop through each member for individual validation/sanitisation
      for (const member of members) {
        try {
          // Check if member data structure is valid
          if (!member.memberId || typeof member.name !== "string" || !member.name.trim())
          throw new Error("Each member must have a valid memberId and non-empty name.");

          //Check duplicate memberId
          if (memberIdSet.has(member.memberId)) {
            throw new Error("Duplicate memberId in request.")
          }
          // Validate and sanitise member name
          const result = sanitizeAndValidateString(member.name, MAX_NAME_LENGTH, "memberName", allowedNameRegex);
        if (result.error) throw new Error(result.error);

        memberIdSet.add(member.memberId);
        finalMembers.push({
                  memberId: member.memberId, // Client-generated UUID is used as a key
                  name: result.value!, // Use the sanitised value
        });
      } catch (err: any) {
        return res.status(400).json({ message: `Member ${member.memberId} error: ${err.message}` });
      }
    }
      
      //Database Operation: Create and save group object 
      const newGroup = await Group.create({
        groupName: sanitizedGroupName.value,
        members: finalMembers,
        userId: userId,  // Authorisation: Associate the group with the authenticated user
      });

       res.status(201).json({ message: "Group created successfully", data: newGroup });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'ValidationError') {
        return handleServerError(res, error, "POST /api/groups (Mongoose Validation)"); 
        }
      return handleServerError(res, error, "POST /api/groups");
    }
  }
);

///---------------------------------------------
// GET /api/groups - Get all groups for a user
//-------------------------------------------------

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
      // Find groups owned by the current user
      const groups = await Group.find({ userId: userId })
        .select('_id groupName members userId createdAt')
        .sort({ createdAt: -1, })
        .lean();
      res.status(200).json({ message: "Success", data: groups }); // Success Response 
    } catch (error: unknown) {
      return handleServerError(res, error, "GET /api/groups");
    }
  }
);
 
//--------------------------------------------
// GET /api/groups/:id -Get a single group by ID
//----------------------------------------------
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

      //Check for valid MongoDB ID format (NoSQL prevention)
      if (!isValidMongoId(req.params.id)) {
         return res.status(400).json({ message: "Invalid group ID format." });
        }

      //Find the group by both _id and userId
      const group = await Group.findOne({
        _id: req.params.id,
        userId: userId,
      }).select("_id groupName members userId createdAt") 
      .lean();

      if (!group) {
        return res.status(404).json({ message: "Group not found." });
      }
       res.status(200).json({ message: "Success", data: group }); // Success Response
    } catch (error: unknown) {
      return handleServerError(res, error, "GET /api/groups/:id");
    }
  }
);

//------------------------------------------
// PUT /api/groups/:id - Update a group by ID
//-----------------------------------------------

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

      //Check ID format
      if (!isValidMongoId(req.params.id)) {
         return res.status(400).json({ message: "Invalid group ID format." });
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

      const memberIdSet = new Set<string>();
      const finalMembers = [];
      //Loop and process each member
      for (const member of members) {
          try {
            // Check if member data structure is valid
            if (!member.memberId || typeof member.name !== "string" || !member.name.trim())
              throw new Error("Each member must have a valid memberId and non-empty name.");

            //Check duplicate memberId
            if (memberIdSet.has(member.memberId)) throw new Error("Duplicate memberId in request.");

            // Validate and sanitise member name
            const result = sanitizeAndValidateString(member.name, MAX_NAME_LENGTH, "memberName", allowedNameRegex);
            if (result.error) throw new Error(result.error);

            memberIdSet.add(member.memberId);
            finalMembers.push({ memberId: member.memberId, name: result.value! });
          } catch (err: any) {
            return res.status(400).json({ message: `Member ${member.memberId} error: ${err.message}` });
          }
        }


      //update a record only if _id and userId match
      const updatedGroup = await Group.findOneAndUpdate(
        { _id: req.params.id, userId: userId },
        {
          groupName: sanitizedGroupName.value,
          members: finalMembers,
        },
        { new: true, runValidators: true }
      ).select('_id groupName members userId createdAt') //Select only the required fields and retrieve it as a plain object.
      .lean();

      if (!updatedGroup) return res.status(404).json({ message: "Group not found or access denied." });
      // Success Response
      res.status(200).json({ message: "Group updated successfully", data: updatedGroup });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'ValidationError') {
          return handleServerError(res, error, "PUT /api/groups/:id (Mongoose Validation)"); 
        }
      return handleServerError(res, error, "PUT /api/groups/:id");
    }
  }
);

//--------------------------------------------
// DELETE /api/groups/:id - Delete a group by ID
//--------------------------------------------------
router.delete(
  "/:id",
  ClerkExpressRequireAuth(),
  apiLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      //Check for valid MongoDB ID format
      if (!isValidMongoId(req.params.id)) {
         return res.status(400).json({ message: "Invalid group ID format." });
      }

      // Delete record only if_id and userId match
      const result = await Group.deleteOne({
        _id: req.params.id,
        userId: userId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Group not found or access denied." });
      }
      // Success Response
      res.status(200).json({ message: "Group deleted successfully" });
    } catch (error: unknown)  {
      return handleServerError(res, error, "DELETE /api/groups/:id");
    }
  }
);

export default router;
