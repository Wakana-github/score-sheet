
/*
* This API endpoint handles updating a user's nickname.
* It performs authentication via Clerk, applies rate limiting (Upstash),
* validates and sanitizes the nickname input, and updates the nickname in both:
* 1. Clerk's publicMetadata and 2. app database (via updateUser function)
*/

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { updateUser } from '../../lib/db/user';
import { applyRateLimit } from '../../lib/rateLimit'; 
import { sanitizePlainText, handleServerError } from '../../lib/sanitizeHelper';
import {allowedNameRegex, MAX_NAME_LENGTH} from '../../lib/constants'
import { verifyRequestOrigin, verifyCsrfToken } from "@/app/lib/security";


export async function POST(req: Request) {
  try {
      // authentication 
      const { userId } = await auth();
      if (!userId) {
        console.error('API Error: No userId found in authentication.'); 
        return new NextResponse('Unauthorized', { status: 401 });
      }

      // Check CSRF Token and Origin
        const originError = verifyRequestOrigin(req);
        if (originError) return originError;
        const csrfError = await verifyCsrfToken(req);
        if (csrfError) return csrfError;

      // apply rate limit
      let rateLimitOk = false;
      try {
        // when over the limit
          rateLimitOk = await applyRateLimit(userId);
      } catch (err) {
          console.error('Rate limit error, defaulting to block:', err);
      }
      if (!rateLimitOk) return new NextResponse('Too many requests. Please try again later.', { status: 429 });

      //fetch request body
      let body;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON format.' }, { status: 400 });
      }
      
      const rawNickname = body.nickname?.trim();

      if (!rawNickname || typeof rawNickname !== 'string') {
          return NextResponse.json({ success: false, message: 'Nickname is required.' },{ status: 400 });
      }

      // check regex
      if (!allowedNameRegex.test(rawNickname)) {
          return NextResponse.json({ success: false, message: 'Nickname contains invalid characters.' }, { status: 400 });
      }

      //sanitize
      const nickname = sanitizePlainText(rawNickname);

      // check multibite character (Japanese)
      const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
      const charCount = [...segmenter.segment(nickname)].length;

    if ( charCount > MAX_NAME_LENGTH) {
          return NextResponse.json({
            success: false,
            message: `Nickname cannot exceed ${MAX_NAME_LENGTH} characters.` 
          }, { status: 400 });
        }
      
      

      //Update Clerk metadata
      const client = await clerkClient();

      // get existed metadata
      const existingMetadata = await client.users.getUser(userId).then(user => user.publicMetadata);

      await client.users.updateUser(userId, {
      publicMetadata: {
      ...existingMetadata,  // spread existed metadata
      nickname: nickname, //sanitized nickname
      },
      });

      console.log('Metadata successfully updated.');



      //Update nickname in DB
      const updatedUser = await updateUser(userId, { nickname });

          console.log('Nickname update successful.');


      if (!updatedUser) {
            console.error('API Error: updateUser function returned null. User may not exist in DB.'); 
            return NextResponse.json({ success: false, message: 'User not found in database.' }, { status: 404 });
          }


      return NextResponse.json({ success: true, user: updatedUser }, { status: 200 });

  } catch (error) {
    handleServerError('nickname-update-api', error);
    return NextResponse.json({ success: false, message: 'Failed to update nickname' }, { status: 500 });
  }
}