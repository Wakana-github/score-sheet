import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { updateUser } from '@/app/server/lib/db/user';
import { Ratelimit } from '@upstash/ratelimit'; 
import { Redis } from '@upstash/redis';


// varidation rule 
const MAX_NICKNAME_LENGTH = 30;
const allowedCharsRegex = /^[a-zA-Z0-9Ａ-Ｚａ-ｚ０-９\sぁ-んァ-ヶ一-龠ー\-_\.\/\(\)\u{1F000}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]*$/u;


//allow once per 10 secounds 
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(2, '10 s'),
  analytics: true,
  timeout: 10000,
});



export async function POST(req: Request) {
// authentication 
const { userId } = await auth();
if (!userId) {
console.error('API Error: No userId found in authentication.'); 
return new NextResponse('Unauthorized', { status: 401 });
}

// apply rate limit
  const identifier = userId; // use clerk user ID as identifier
  const { success } = await ratelimit.limit(identifier);

  // when over the limit
  if (!success) {
    return new NextResponse('Too many requests. Please try again after 10 seconds.', { status: 429 });
  }


try {
const { nickname } = await req.json();

if (!nickname || nickname.length > MAX_NICKNAME_LENGTH || !allowedCharsRegex.test(nickname)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid nickname. Some symbols are not allowed. Maximum 30 characters.'
      }, { status: 400 });
    }

//Update Clerk metadata
const client = await clerkClient();

// get existed metadata
const existingMetadata = await client.users.getUser(userId).then(user => user.publicMetadata);

await client.users.updateUser(userId, {
publicMetadata: {
...existingMetadata,  // spread existed metadata
 nickname: nickname, //update or add nickname 
},
});

 console.log('Metadata successfully updated.');



//Update nickname in DB

const updatedUser = await updateUser(userId, {
      nickname: nickname, 
    });

    console.log('nickname updated');


if (!updatedUser) {
      console.error('API Error: updateUser function returned null. User may not exist in DB.'); // ログ8
      return NextResponse.json({ success: false, message: 'User not found in database.' }, { status: 404 });
    }


return NextResponse.json({ success: true, user: updatedUser }, { status: 200 });

} catch (error) {
console.error('Error updating metadata and database:', error);
return NextResponse.json({ success: false, message: 'Failed to update nickname' }, { status: 500 });
}
}