import mongoose from "mongoose";
import { ServerApiVersion } from "mongodb";
import dotenv from 'dotenv';
dotenv.config();

//connect db
async function connectDB() {
  const MONGODB_URI = process.env.MONGO_URI;

  if (!MONGODB_URI) {
    console.error('Error: MONGO_URI is not defined in .env file.');
    process.exit(1); // If there is no MONGO_URI, close app
  }

  try {
    await mongoose.connect(MONGODB_URI, { 
      useNewUrlParser: true, // default true after Mongoose 6.0
      useUnifiedTopology: true, // default true after Mongoose 6.0
      serverApi: ServerApiVersion.v1 // 
    });
    console.log('MongoDB Connected to database successfully!'); // 
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // close app when connection failed
  }
}

export default connectDB;