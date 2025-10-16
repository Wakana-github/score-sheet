import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Group from "../../server/models/group";
import connectDB from "../../server/helper/score-sheet-db"
import { sanitizeAndValidateString, handleServerError } from "../../lib/sanitizeHelper";
import {MAX_GROUP_NAME_LENGTH, MAX_NAME_LENGTH, MAX_NUM_MEMBERS, MAX_GROUPS} from "../../lib/constants";

/*
This API Route (app/api/groups/route.ts) handles operations on the entire Group collection.
GET: Fetches a list of all groups belonging to the authenticated user.
POST: Creates a new group record in the database after authenticating the user and validating the request body.
*/

interface MemberInput {
  memberId: string;
  name: string;
}

interface GroupInput {
  groupName: string;
  members: MemberInput[];
}


/* GET: Fetches all group records created by the current user. */ 
export async function GET() {

  // Establish Database Connection
  try {
    await connectDB();
  } catch (error) {
    return handleServerError("DB Connection (GET)", error, 503);
  }
  //Authentication Check
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  //Fetch User-Specific Data
  try {
    // Find groups 
    const groups = await Group.find({ userId })
    .select("_id groupName members createdAt")
    .sort({ createdAt: -1 })
    .lean(); 
    
    return NextResponse.json(groups); 
  } catch (error) {
     return handleServerError("GET /api/groups", error, 500); 
}
}

/* POST:" Create new groiup record */
export async function POST(request: Request) {
  // Connect DB
  try {
    await connectDB();
  } catch (error) {
    return handleServerError("DB Connection", error, 503);
  }

  // Authentication check
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    // check request body
    const body = await request.json();

    // Type check
    if (
      typeof body !== "object" || body === null || !("groupName" in body) || !("members" in body)
    ) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }
    const { groupName, members } = body;

    if (!groupName || !members || members.length === 0) {
        return NextResponse.json({ message: "Missing group name or members data." }, { status: 400 });
    }

    // Group creation limit check
      const groupCount = await Group.countDocuments({ userId: userId });
      if (groupCount >= MAX_GROUPS) {
          return NextResponse.json({ 
              message: `Group limit reached. You can only create up to ${MAX_GROUPS} groups.`}, { status: 403 });
      }

      // Validate and sanitize groupName
      const sanitizedGroupNameResult = sanitizeAndValidateString(
          groupName,
          MAX_GROUP_NAME_LENGTH,
          "groupName",
      );
      if (sanitizedGroupNameResult.error) {
          return NextResponse.json({ message: sanitizedGroupNameResult.error }, { status: 400 });
      }
      const finalGroupName = sanitizedGroupNameResult.value;

      // Validate and sanitize members array
      if (!Array.isArray(members) || members.length === 0 || members.length > MAX_NUM_MEMBERS) {
          return NextResponse.json({ message: `Members count must be 1-${MAX_NUM_MEMBERS}.` }, { status: 400 });
      }

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
          
          // Duplicate check
          if (memberIdSet.has(member.memberId)) {
              return NextResponse.json({ message: `Duplicate member ID found for member: ${member.name}.` }, { status: 400 });
          }
          memberIdSet.add(member.memberId);
          
          // Validate and sanitize member name
          const sanitizedNameResult = sanitizeAndValidateString(
              member.name, 
              MAX_NAME_LENGTH, 
              "memberName", 
          );
          if (sanitizedNameResult.error) {
              return NextResponse.json({ message: sanitizedNameResult.error }, { status: 400 });
          }

          finalMembers.push({
              memberId: member.memberId,
              name: sanitizedNameResult.value!, 
          });
      }

    // Create group instance and save it
      const newGroup = await Group.create({
            userId, 
            groupName: finalGroupName, 
            members: finalMembers,
        });

    // return success response (HTTP 201 Created)
    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    return handleServerError("POST /api/groups", error, 500);
  }
}