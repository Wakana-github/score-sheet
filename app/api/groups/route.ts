import { applyRateLimit } from '../../lib/rateLimit'; 
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Group from "../../lib/db/models/group";
import connectDB from "../../lib/db/score-sheet-db"
import { sanitizeAndValidateString, handleServerError } from "../../lib/sanitizeHelper";
import { 
    MAX_GROUP_NAME_LENGTH, 
    MAX_NAME_LENGTH, 
    MAX_NUM_MEMBERS, 
    MAX_GROUPS,
    allowedGroupRegex,
    allowedNameRegex,
} from "../../lib/constants";
import { isValidMemberId } from '@/app/lib/memberIdCheck';
import { verifyRequestOrigin, verifyCsrfToken } from "@/app/lib/security"; 
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


/*------ GET: Fetches all group records created by the current user. ----------*/ 
export async function GET(req: Request) {
  
  //Authentication Check
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  // rate limit
    const ip = userId ?? (req.headers.get("x-forwarded-for") ?? "unknown");
    const isAllowed = await applyRateLimit(ip,'read');
    if (!isAllowed) {
        return NextResponse.json({ message: "Too many requests, please try again later." }, { status: 429 });
    }

  // Establish Database Connection
  try {
    await connectDB();
  } catch (error) {
    return handleServerError("DB Connection (GET)", error, 503);
  }


  //Fetch User-Specific Data
  try {
    // Find groups 
    const groups = await Group.find({ userId })
    .select("_id groupName members createdAt")
    .sort({ createdAt: -1 })
    .lean(); 
    
    return NextResponse.json({ message: "Success", data: groups });
  } catch (error) {
     return handleServerError("GET /api/groups", error); 
}
}

/*----- POST:" Create new groiup record -----------------*/
export async function POST(req: Request) {
  // Verify request origin
  const originError = verifyRequestOrigin(req);
  if (originError) return originError;
  // Verify CSRF token
  const csrfError = await verifyCsrfToken(req);
  if (csrfError) return csrfError;
  // Authentication check
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  //Rate Limit
  const ip = userId?? req.headers.get("x-forwarded-for") ?? "unknown";
  const isAllowed = await applyRateLimit(ip, 'write');
  if (!isAllowed) {
        return NextResponse.json({ message: "Too many requests, please try again later." }, { status: 429 });
    }

  // Connect DB
  try {
    await connectDB();
  } catch (error) {
    return handleServerError("DB Connection", error, 503);
  }



  try {
    // check request body
    let body: unknown;
    try {
          body = await req.json();
      } catch {
      return NextResponse.json({ message: "Invalid JSON format." }, { status: 400 });
    }

    // Type check
    if (
      typeof body !== "object" || body === null || !("groupName" in body) || !("members" in body)
    ) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }
    const { groupName, members } = body as { groupName: unknown, members: unknown };
    
    if (typeof groupName !== 'string' || !Array.isArray(members)) {
             return NextResponse.json({ message: "Missing group name or members data or invalid type." }, { status: 400 });
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
          allowedGroupRegex
      );
      if (sanitizedGroupNameResult.error) {
          return NextResponse.json({ message: sanitizedGroupNameResult.error }, { status: 400 });
      }
      const finalGroupName = sanitizedGroupNameResult.value;

      // Validate and sanitize members array
      if (!Array.isArray(members) || members.length === 0 || members.length > MAX_NUM_MEMBERS) {
          return NextResponse.json({ message: `Members count must be 1-${MAX_NUM_MEMBERS}.` }, { status: 400 });
      }

      //validate and sanitize each men=mber
      const memberIdSet = new Set<string>();
      const finalMembers: MemberInput[] = [];

      for (const member of members) {
          // Basic structure check
          if (
            typeof member !== "object" || member === null ||
            typeof (member as MemberInput).memberId !== "string" || (member as MemberInput).memberId.trim() === "" ||
            typeof (member as MemberInput).name !== "string" || (member as MemberInput).name.trim() === ""
          ) {
              return NextResponse.json({ message: "Invalid member structure." }, { status: 400 });
          }
          const currentMember = member as MemberInput;

          //memberId format check
          if (!isValidMemberId(currentMember.memberId)) {
            return NextResponse.json({ message: `Invalid memberId format: ${currentMember.memberId}` }, { status: 400 });
          }
          
          // Duplicate check
          if (memberIdSet.has(currentMember.memberId)) {
              return NextResponse.json({ message: `Duplicate member ID found for member: ${currentMember.name}.` }, { status: 400 });
          }
          memberIdSet.add(currentMember.memberId);
          
          // Validate and sanitize member name
          const sanitizedNameResult = sanitizeAndValidateString(
              member.name, 
              MAX_NAME_LENGTH, 
              "memberName",
              allowedNameRegex 
          );
          if (sanitizedNameResult.error) {
              return NextResponse.json({ message: sanitizedNameResult.error }, { status: 400 });
          }

          finalMembers.push({
              memberId: currentMember.memberId,
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
   return NextResponse.json({ message: "Group created successfully", data: newGroup }, { status: 201 });
    } catch (error) {
        return handleServerError("POST /api/groups", error);
  }
}