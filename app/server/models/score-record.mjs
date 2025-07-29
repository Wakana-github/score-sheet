import mongoose from 'mongoose';

// define Mongoose model 

const ScoreRecordSchema = new mongoose.Schema({
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


const ScoreRecord = mongoose.model('ScoreRecord', ScoreRecordSchema);

export default ScoreRecord;