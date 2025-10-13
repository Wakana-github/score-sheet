// import { Request, Response, NextFunction } from "express";
// import { getAuth } from "@clerk/express";

// interface AuthRequest extends Request {
//   auth?: { userId: string | null }; 
// }

// export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
//   const { userId } = getAuth(req);

//   if (!userId) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }

//     req.auth = { userId };
//   next();
// }