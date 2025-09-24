import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

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
  ownerId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Group = models.Group || model('Group', GroupSchema);

export default Group;