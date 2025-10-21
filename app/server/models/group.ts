import mongoosePkg,  { Document } from 'mongoose';
const { default: mongoose, Schema, model, models} = mongoosePkg;

const MAX_NAME_LENGTH = 30;
const MAX_GROUP_NAME_LENGTH = 30;

export interface IMember {
    memberId: string;
    name: string;
}

export interface IGroup extends mongoosePkg.Document {
    _id:string;
    groupName: string;
    members: IMember[]; 
    userId: string; 
    createdAt: Date;
    updatedAt: Date; 
}

const GroupSchema = new Schema({
    groupName: {
    type: String,
    required: true,
    trim: true,
    maxlength:MAX_GROUP_NAME_LENGTH
  },
  members: [{ // object array
            memberId: { 
                type: String, 
                required: true 
            },
            name: { 
                type: String, 
                required: true,
                trim: true,
                maxlength: MAX_NAME_LENGTH
            },
        }],
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