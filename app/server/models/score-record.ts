import mongoose, { Document, Schema } from 'mongoose';


// 1. Define a TypeScript interface that corresponds to the schema.
// This interface guarantees the type of the score record object.
export interface IScoreRecord extends Document {
  id: string;
  gameTitle: string;
  playerNames: string[];
  scoreItemNames: string[];
  scores: number[][];
  numPlayers: number;
  numScoreItems: number;
  createdAt: Date;
  lastSavedAt: Date;
}

// define Mongoose model 
const ScoreRecordSchema: Schema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, 
  gameTitle: { type: String, required: true },
  playerNames: [{ type: String }],
  scoreItemNames: [{ type: String }],
  scores: { type: [[Number]], required: true }, 
  numPlayers: { type: Number, required: true },
  numScoreItems: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }, 
  lastSavedAt: { type: Date, default: Date.now } 
});

// 3. Create the model and associate it with the type information.
// Use mongoose.models.ScoreRecord if it exists; otherwise, create a new one.
const ScoreRecord = (mongoose.models.ScoreRecord as mongoose.Model<IScoreRecord>)

export default ScoreRecord;