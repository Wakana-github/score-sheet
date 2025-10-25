// import { auth } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";
// import dbConnect from "@/app/lib/db//score-sheet-db";
// import type { UserCreationType } from "@/app/lib/db//models/user.model"; 
// import User from "@/app/lib/db//models/user.model";  
// import ScoreRecord from "@/app/lib/db/models/score-record";
// import Group from "@/app/lib/db/models/group";

export async function DELETE() {
  const any= 1;

}
// // GDPR / CCPA / APPs - Right to Access (Data Portability)
// export async function GET() {
//   try {
//     await dbConnect();

//     const { userId } = await auth();
//     if (!userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // retrieve user data
//     const user = await User.findOne({ clerkId: userId }).lean();
//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     // retrieve data that user saved on this app
//     const [scores, groups] = await Promise.all([
//       ScoreRecord.find({ userId }).lean(),
//       Group.find({ userId }).lean(),
//     ]);

//     // 機微情報を除外（例: パスワード・内部トークン）
//     const safeUser = {
//       name: user.name,
//       email: user.email,
//       clerkId: user.clerkId,
//       createdAt: user.createdAt,
//     };

//     // Data structure to export data
//     const exportData = {
//       exportedAt: new Date(),
//       user: safeUser,
//       scores,
//       groups,
//     };

//     // DOwnload as JSON files
//     return new NextResponse(JSON.stringify(exportData, null, 2), {
//       headers: {
//         "Content-Type": "application/json",
//         "Content-Disposition": `attachment; filename="user_data_${userId}.json"`,
//         "Cache-Control": "no-store",
//       },
//     });
//   } catch (error) {
//     console.error("[EXPORT_DATA_ERROR]", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }