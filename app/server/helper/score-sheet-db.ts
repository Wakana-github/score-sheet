import mongoosePkg from "mongoose";
import { ServerApiVersion } from "mongodb";
import dotenv from 'dotenv';
dotenv.config();

const { default: mongoose } = mongoosePkg;
type MongooseType = typeof mongoose; // when requires types

  // connection URL in .env
  const MONGODB_URI = process.env.MONGO_URI as string;
  //check if URL is set
    if (!MONGODB_URI) {
    throw new Error("Please define the MONGO_URI environment variable inside .env.local");
    // process.exit(1); // If there is no MONGO_URI, close app
  }

  interface MongooseCache{
  conn: MongooseType | null;
  promise: Promise<MongooseType> | null;
  }



//store cache in the global object
const cached = global as typeof global & {
  mongoose?: MongooseCache
};


  
if (!cached.mongoose) {
  cached.mongoose = { conn: null, promise: null };
}


//connect db
async function connectDB() {

  //return cached connection if database has already connected
 if (cached.mongoose!.conn) { // '!'を付けてnon-null assertionを行う
    return cached.mongoose!.conn;
  }

    if(!cached.mongoose!.promise) { // '!'を付けてnon-null assertionを行う
    const opts = {
      dbName: "score-sheet-db",
      serverApi: ServerApiVersion.v1, 
      bufferCommands: false, // コマンドバッファリングを無効にする
      connectTimeoutMS: 60000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMs: 45000,
    };

   // プロミスをキャッシュ
    cached.mongoose!.promise = mongoose.connect(MONGODB_URI, opts).then((_mongoose) => {
      console.log("MongoDB Connected successfully!");
      return _mongoose;
    }).catch((err) => {
      console.error("MongoDB connection error:", err);
      // 接続失敗した場合はプロミスをリセット
      cached.mongoose!.promise = null; 
      throw err;
    });
  }

  try {
    cached.mongoose!.conn = await cached.mongoose!.promise;
  } catch (e) {
    throw e;
  }

   return cached.mongoose!.conn;
}

export default connectDB;
//   try {
//     await mongoose.connect(MONGODB_URI, { 
//       useNewUrlParser: true, // default true after Mongoose 6.0
//       useUnifiedTopology: true, // default true after Mongoose 6.0
//       serverApi: ServerApiVersion.v1, 
//       connectTimeoutMS: 30000,
//     });
//     console.log('MongoDB Connected to database successfully!'); // 
//   } catch (err) {
//     console.error('MongoDB connection error:', err);
//     process.exit(1); // close app when connection failed
//   }
// }

