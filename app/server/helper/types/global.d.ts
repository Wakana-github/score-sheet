import mongoose from "mongoose"; 

// Defines the cache structure for the Mongoose connection
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extends the global object to include the cache property
// Use declare global to provide type information at compile time, not runtime.
declare global {
  var mongooseCache: MongooseCache | undefined;
}

// This export statement ensures the file is treated as a module,
// preventing TypeScript scope issues while keeping global declarations.
export {};