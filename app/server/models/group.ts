import mongoose, { Schema, model, models, Document } from 'mongoose';
import { MAX_NAME_LENGTH, MAX_GROUP_NAME_LENGTH } from "../../lib/constants.ts";

// Member Interface
export interface IMember {
    memberId: string; 
    name: string;     
}

//Group Interface
export interface IGroup extends Document {
    _id:string;
    groupName: string;
    members: IMember[];
    userId: string; 
    createdAt: Date;
    updatedAt: Date; 
}

// Member Schema
const MemberSchema = new Schema({
    memberId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: MAX_NAME_LENGTH },
}, { _id: false });


//Group Schema
const GroupSchema = new Schema({
  groupName: {
    type: String,
    required: true,
    trim: true,
    maxlength:MAX_GROUP_NAME_LENGTH
  },
  members: {
    type: [MemberSchema],
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Group = (models.Group as mongoose.Model<IGroup>) || model<IGroup>('Group', GroupSchema);

export default Group;