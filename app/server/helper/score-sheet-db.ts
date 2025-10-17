import dotenv from 'dotenv';
dotenv.config();
import mongoose from "mongoose"; 
import { ServerApiVersion } from "mongodb";



  // connection URL in.env
  const MONGODB_URI = process.env.MONGO_URI as string;

  //check if URL is set
  if (!MONGODB_URI) {
    throw new Error(" Missing MONGO_URI in environment variables (.env.local)");
    // process.exit; // If there is no MONGO_URI, close app
  }

  // DEBUG
  console.log("--- DB Connection Debug ---");
  console.log("MONGO_URI loaded:", !!MONGODB_URI);
  if (MONGODB_URI) {
      console.log("MONGO_URI check passed.");
  }
  console.log("---------------------------");

  //Define types
  type MongooseType = typeof mongoose; 

  interface MongooseCache{
  conn: MongooseType | null;
  promise: Promise<MongooseType> | null;
  }



//store cache in the global object
const globalForMongoose = global as typeof global & {
  mongoose?: MongooseCache
};


// reset if there is no cach
if (!globalForMongoose.mongoose) {
  globalForMongoose.mongoose = { conn: null, promise: null };
}


//connect db
async function connectDB(): Promise<MongooseType> {
  const cached = globalForMongoose.mongoose!;

  //return cached connection if database has already connected
  if (cached.conn) {
    console.log("MongoDB: Reusing existing connection");
    return cached.conn;
  }

    if(!cached.promise) { // '!'を付けてnon-null assertionを行う
    const opts = {
      dbName: process.env.MONGODB_DB_NAME || "score-sheet-db",
      serverApi: ServerApiVersion.v1, 
      bufferCommands: false, // コマンドバッファリングを無効にする
      connectTimeoutMS: 60000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMs: 45000,
    };

   // cache prmise 
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((_mongoose) => {
      console.log("MongoDB Connected successfully!");
      return _mongoose;
    }).catch((err) => {
      console.error("MongoDB connection error:", err);
      cached.promise = null; // reset for retry
      throw err;
    });
  }

  try {
   cached.conn = await cached.promise;
  } catch (e) {
    cached.conn = null;
    throw e;
  }

   return cached.conn;
}

export default connectDB;