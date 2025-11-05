
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


export async function GET() {
  const { userId } = await auth()
  const user = await currentUser();
    //when user not logged in
    if (!userId) {
    return NextResponse.json({ message: "Not Authenticated" }, { status: 401 });
  }

  const mongoDbUserId = user?.publicMetadata?.userId as string | undefined;
  //user logged in
    return NextResponse.json(
        {
            message: "authenticated",
            data: {
              userId: userId,
              username: user?.username,
              mongoDbUserId: mongoDbUserId },
        },
        {status:200}
    );
}


