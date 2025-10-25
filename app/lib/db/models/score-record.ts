import mongoosePkg from 'mongoose';

const { default: mongoose, Schema, models, model } = mongoosePkg;


export interface IPlayer {
   memberId: string | null;
   name: string;
}

const PlayerSchema = new Schema({
    memberId: { type: String, required: false, default: null}, 
    name: { type: String, required: true, maxlength: 30 }
}, { _id: false });


// 1. Define a TypeScript interface that corresponds to the schema.
// This interface guarantees the type of the score record object.
export interface IScoreRecord extends mongoosePkg.Document {
  gameTitle: string;
  playerNames: IPlayer[];
  scoreItemNames: string[];
  scores: number[][];
  numPlayers: number;
  numScoreItems: number;
  createdAt: Date;
  lastSavedAt: Date;
  userId: string;
  custom?: boolean; 
  groupId?: string; 
}

// A type that extracts only the fields required for new record creation.
// It omits automatically generated fields like _id, createdAt, etc.
export type IScoreRecordCreation = Omit<IScoreRecord, '_id' | 'createdAt' | 'lastSavedAt'>;


// define Mongoose model 
const ScoreRecordSchema = new Schema({
  gameTitle: { type: String, required: true },
  playerNames: { type: [PlayerSchema], required: true },
  scoreItemNames: [{ type: String }],
  scores: { type: [[Number]], required: true }, 
  numPlayers: { type: Number, required: true },
  numScoreItems: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }, 
  lastSavedAt: { type: Date, default: Date.now },
  userId: { type: String, required: true },
  custom: { type: Boolean, required: true },
  groupId: { type: String, required: false }
});

// 3. Create the model and associate it with the type information.
// Use mongoose.models.ScoreRecord if it exists; otherwise, create a new one.
const ScoreRecord = (models.ScoreRecord || model<IScoreRecord>('ScoreRecord', ScoreRecordSchema));

export default ScoreRecord;