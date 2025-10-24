// import { auth } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";
// import dbConnect from "@/server/dbConnect";
// import User from "@/server/models/user";
// import ScoreRecord from "@/server/models/score-record";
// import Group from "@/server/models/group";

// // GDPR / CCPA / APPs - Right to Erasure (Delete Personal Data)
// export async function DELETE() {
//   try {
//     await dbConnect();

//     const { userId } = auth();
//     if (!userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const user = await User.findOne({ clerkId: userId });
//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     // 削除操作を実行（同時並行で削除）
//     await Promise.all([
//       User.deleteOne({ clerkId: userId }),
//       ScoreRecord.deleteMany({ userId }),
//       Group.deleteMany({ userId }),
//     ]);

//     // Clerk 側のアカウント削除は手動で行う（別途安全に実装可能）

//     return NextResponse.json({
//       message: "✅ Your account and all related data have been permanently deleted.",
//     });
//   } catch (error) {
//     console.error("[DELETE_USER_ERROR]", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }