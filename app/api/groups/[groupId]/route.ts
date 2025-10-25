import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import Group from "../../../lib/db/models/group";
import { applyRateLimit} from "../../../lib/rateLimit";
import connectDB from "../../../lib/db/score-sheet-db";
import { sanitizeAndValidateString, handleServerError } from "../../../lib/sanitizeHelper";
import { 
    MAX_GROUP_NAME_LENGTH, 
    MAX_NAME_LENGTH, 
    MAX_NUM_MEMBERS,
    allowedGroupRegex,
    allowedNameRegex,
} from "@/app/lib/constants";
import { isValidMemberId } from "@/app/lib/memberIdCheck";
import { verifyRequestOrigin, verifyCsrfToken } from "@/app/lib/security";

/*
This API Route (app/api/groups/[groupId]/route.ts) handles operations on a single Group resource.
- GET: Fetches a specific group.
- PUT: Updates a specific group.
- DELETE: Deletes a specific group.
All operations verify user authentication and ownership (authorisation).
*/


//MEmber Interface 
interface MemberInput {
    memberId: string;
    name: string;
}

interface Params {
  params: { groupId: string };
}

const isValidMongoId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

//-----------------------------------------------------
// GET: Fetches a specific group (Corresponds to client's fetchGroupData)
//-----------------------------------------------------
export async function GET(
  request: Request,
  { params }: { params: { groupId: string } } // Get dynamic segment [groupId] as params
) {

    // Authentication Check
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Ratew limit
    const ip = userId ?? request.headers.get("x-forwarded-for") ?? "anonymous";
    const isAllowed = await applyRateLimit(ip, 'read');
    if (!isAllowed) {
        return NextResponse.json({ message: "Too many requests, please try again later." }, { status: 429 });
    }

  // Establish DB Connection
  try {
    await connectDB();
  } catch (error: unknown) {
    return handleServerError("DB Connection (GET)", error, 503);
  }



  try {
    const { groupId } = await params;

    // Validate id type
        if (!isValidMongoId(groupId)) {
            return NextResponse.json({ message: "Invalid group ID format." }, { status: 400 });
        }
    
    // Find the group, verifying ownership (userId)
    const group = await Group.findOne({ _id: groupId, userId })
    .select("_id groupName members userId createdAt")
    .lean();

    if (!group) {
      // Return 404 if the group ID is not found or user does not own it
      return NextResponse.json({ message: "Group not found or access denied" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Group updated successfully" });
  } catch (error: unknown) {
    return handleServerError("GET /api/groups/[groupId]", error, 500);
  }
}

//-----------------------------------------------------
// PUT: Updates the group (Corresponds to client's handleSubmit)
//-----------------------------------------------------
export async function PUT(
  request: Request,
  { params }: { params: { groupId: string } }
) {

    // Authentication Check
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    // Check CSRF Token and Origin
    const originError = verifyRequestOrigin(request);
    if (originError) return originError;
    const csrfError = await verifyCsrfToken(request);
    if (csrfError) return csrfError;

    // rate limit
    const ip = userId?? request.headers.get("x-forwarded-for") ?? "anonymous";
    const isAllowed = await applyRateLimit(ip, 'write');
    if (!isAllowed) {
        return NextResponse.json({ message: "Too many requests, please try again later." }, { status: 429 });
    }

  // Establish DB Connection
  try {
    await connectDB();
  } catch (error: unknown) {
    return handleServerError("DB Connection (PUT)", error, 503);
  }

  

  try {
    const { groupId } = await params;
    // validate id type
        if (!isValidMongoId(groupId)) {
            return NextResponse.json({ message: "Invalid group ID format." }, { status: 400 });
        }
    const body = await request.json(); // Data sent from the client
    const { groupName, members } = body;

    // Validate and sanitize groupName
    const sanitizedGroupNameResult = sanitizeAndValidateString(
        groupName, MAX_GROUP_NAME_LENGTH, "groupName",allowedGroupRegex);
    if (sanitizedGroupNameResult.error) {
        return NextResponse.json({ message: sanitizedGroupNameResult.error }, { status: 400 });
    }
    const finalGroupName = sanitizedGroupNameResult.value;

    // Validate and sanitize members array 
    if (!Array.isArray(members) || members.length === 0 || members.length > MAX_NUM_MEMBERS) {
        return NextResponse.json({ message: `Members count must be 1-${MAX_NUM_MEMBERS}.` }, { status: 400 });
    }

    //Validate and sanitise each member
    const memberIdSet = new Set<string>();
    const finalMembers: MemberInput[] = [];

    for (const member of members) {
          // Basic structure check
          if (
              typeof member !== "object" || member === null ||
              typeof member.memberId !== "string" || member.memberId.trim() === "" ||
              typeof member.name !== "string" || member.name.trim() === ""
          ) {
              return NextResponse.json({ message: "Invalid member structure." }, { status: 400 });
          }

          if (!isValidMemberId(member.memberId)) {
                return NextResponse.json({ message: `Invalid memberId format: ${member.memberId}` }, { status: 400 });
              }
          
          // Duplicate check
          if (memberIdSet.has(member.memberId)) {
              return NextResponse.json({ message: `Duplicate member ID found.` }, { status: 400 });
          }

          memberIdSet.add(member.memberId);
          
          // Validate and sanitize member name
          const sanitizedNameResult = sanitizeAndValidateString(
              member.name, MAX_NAME_LENGTH, "memberName", allowedNameRegex
          );
          if (sanitizedNameResult.error) {
              return NextResponse.json({ message: sanitizedNameResult.error }, { status: 400 });
          }
          
          finalMembers.push({
              memberId: member.memberId,
              name: sanitizedNameResult.value!, // Use sanitized value
          });
      }

    // Update the database with safe values
    const updatedGroup = await Group.findOneAndUpdate(
        { _id: groupId, userId }, 
        {   // Use sanitized value
            groupName: finalGroupName, 
            members: finalMembers,     
        },
        { new: true, runValidators: true } 
    ).select('_id groupName members userId createdAt').lean();

    if (!updatedGroup) {
      return NextResponse.json({ message: "Group not found or unauthorized to update" }, { status: 404 });
    }

    return NextResponse.json({ message: "Group updated successfully" });
  } catch (error: unknown) {
    return handleServerError("PUT /api/groups/[groupId]", error, 500);
    }
}

//-----------------------------------------------------
// DELETE: Deletes the group
//-----------------------------------------------------
export async function DELETE(
  request: Request,
  { params }: { params: { groupId: string } }
) {

    // Authentication Check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    // Check CSRF Roken and Origin
    const originError = verifyRequestOrigin(request);
    if (originError) return originError;
    const csrfError = await verifyCsrfToken(request);
    if (csrfError) return csrfError;

  // Rate limit
    const ip = userId?? request.headers.get("x-forwarded-for") ?? "anonymous";
    const isAllowed = await applyRateLimit(ip, 'write');
    if (!isAllowed) {
        return NextResponse.json({ message: "Too many requests, please try again later." }, { status: 429 });
    }

  //Establish DB Connection
  try{
    await connectDB();
  } catch (error: unknown) {
    return handleServerError("DB Connection (DELETE)", error, 503);
  }
    

  try {
    const { groupId } = await params;

    // validate id type
        if (!isValidMongoId(groupId)) {
            return NextResponse.json({ message: "Invalid group ID format." }, { status: 400 });
        }

    // Delete group, verifying ownership
    const deletedGroup = await Group.findOneAndDelete({ _id: groupId, userId });

    if (!deletedGroup) {
      return NextResponse.json(
        { message: "Group not found or unauthorized to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Group deleted successfully" });
  } catch (error: unknown) {
    return handleServerError("DELETE /api/groups/[groupId]", error, 500);
  }
}