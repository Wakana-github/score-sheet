import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IGame extends Document {
  id: number;
  title: string;
  column: number;
  row: number;
  notes: string;
  score_items: string[];
}

const GameSchema: Schema = new Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  column: { type: Number, required: true },
  row: { type: Number, required: true },
  notes: { type: String, required: false },
  score_items: { type: [String], required: true },
});

const GameModel: Model<IGame> = (mongoose.models.Game as Model<IGame>) || 
                                 mongoose.model<IGame>('Game', GameSchema);

export default GameModel;