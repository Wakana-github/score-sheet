import mongoosePkg,  { Document } from 'mongoose';
const { default: mongoose, Schema, model, models} = mongoosePkg;

export interface IGroup extends mongoosePkg.Document {
    _id:string;
    groupName: string;
    members: string[]; 
    userId: string; 
    createdAt: Date;
    updatedAt: Date; 
}

const GroupSchema = new Schema({
    groupName: {
    type: String,
    required: true,
    trim: true,
    maxlength:50
  },
  members: {
    type: [String],
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

const Group = (models.Group) ||model<IGroup>('Group', GroupSchema);

export default Group;