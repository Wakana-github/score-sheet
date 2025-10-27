import mongoosePkg from 'mongoose';
const { default: mongoose, Schema, model, models} = mongoosePkg;
import { InferSchemaType } from 'mongoose';


const UserSchema = new Schema({
  // Clerk User ID
  // The Clerk ID is unique and is the most important piece of information for identifying a user.
  clerkId: {
    type: String,
    required: true,
    unique: true, // Prevents multiple users from having the same Clerk ID.
  },

  // Username
  // Stores the username from Clerk.
  username: {
    type: String,
    unique: true, // It's desirable for usernames to be unique.
    sparse: true, // Allows the unique constraint to function even if username is null.
  },

  // Email Address
  // Clerk can have multiple email addresses, but this assumes the primary email.
  email: {
    type: String,
    required: true,
    unique: true, // It's desirable for email addresses to be unique.
  },

  //nickname
   nickname: {
    type: String,
    sparse: true,
  },

  // Fields for subscription information and other app-specific data.
  stripeCustomerId: {
    type: String,
    unique: true,
    sparse: true, // Allows the unique constraint to function even if the value is null.
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'trialing', 'canceled', 'inactive',"past_due","unpaid"],
    default: 'inactive',
  },
  stripeSubscriptionId: {
    type: String,
    unique: true,
    sparse: true,
  },
  stripePriceId: {
    type: String,
    sparse: true,
  },
  planName: {
    type: String,
    sparse: true,
  },
  subscriptionEndsAt: {
    type: Date,
    sparse: true,
  },

}, {
  timestamps: true // Automatically adds created_at and updated_at fields.
});

//create schema type
type UserType = InferSchemaType<typeof UserSchema>;

export type UserCreationType = {
  clerkId: string;
  email: string;
  username: string | null;
  nickname?: string | null; 
  stripeCustomerId?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'canceled' | 'inactive'|"past_due"|"unpaid";
   stripeSubscriptionId?: string;
  stripePriceId?: string;
  planName?: string;
  subscriptionEndsAt?: Date;
};

export type UserUpdateType = {
    username?: string | null;
    email?: string;
    nickname?: string | null; 
    stripeCustomerId?: string;
    subscriptionStatus?: 'active' | 'trialing' | 'canceled' | 'inactive'|"past_due"|"unpaid";
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    planName?: string;
    subscriptionEndsAt?: Date;
};


//Create the model and associate it with the type information.
const User = (models?.User || model('User', UserSchema));



export default User;