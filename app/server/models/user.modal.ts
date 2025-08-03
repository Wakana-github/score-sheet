import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
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

  // Fields for subscription information and other app-specific data.
  stripeCustomerId: {
    type: String,
    unique: true,
    sparse: true, // Allows the unique constraint to function even if the value is null.
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'trialing', 'canceled', 'inactive'],
    default: 'inactive',
  },
}, {
  timestamps: true // Automatically adds created_at and updated_at fields.
});

// Create and export the model.
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;