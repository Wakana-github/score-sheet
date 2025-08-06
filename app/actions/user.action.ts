"use server";

import User, {UserCreationType, UserUpdateType} from "../server/models/user.modal";
import connectDB from '../server/helper/score-sheet-db'; 
// import { User } from "@clerk/nextjs/server";

// Create new user
export async function createUser(user:UserCreationType ){
    try{
        await connectDB();
        const newUser = await User.create(user);
        return JSON.parse(JSON.stringify(newUser));

        } catch(error){
        console.log(error);
    }
}

export async function updateUser(clerkId: string, user: UserUpdateType) {
    try {
        await connectDB();
        
        const updatedUser = await User.findOneAndUpdate(
            { clerkId: clerkId },
            user,
            { new: true, runValidators: true }
        );
        
        if (!updatedUser) {
            console.error('User not found.');
            return null;
        }

        return JSON.parse(JSON.stringify(updatedUser));
    } catch (error) {
        console.error("Error updating user:", error);
        throw new Error("Failed to update user.");
    }
}

export async function deleteUser(clerkId: string) {
    try {
        await connectDB();
        
        const deletedUser = await User.findOneAndDelete({ clerkId: clerkId });
        
        if (!deletedUser) {
            console.error('User not found for deletion.');
            return null;
        }

        return JSON.parse(JSON.stringify(deletedUser));
    } catch (error) {
        console.error("Error deleting user:", error);
        throw new Error("Failed to delete user.");
    }
}