
import User, {UserCreationType, UserUpdateType} from "./models/user.model";
import connectDB from './score-sheet-db'; 

/*
* This file provides database helper functions to manage user data　in the MongoDB "User" collection. 
* It serves as a middle layer　between the API routes (or other server logic) and the database.
* Called from API routes such as when updating or retrieving user information.
*/


// Create a new user in the database. 
export async function createUser(user:UserCreationType ){
    try{
        await connectDB();
        const newUser = await User.create(user);
        return JSON.parse(JSON.stringify(newUser));

        } catch(error){
        console.error("Error creating user:", (error as Error).message); // console.error に変更
        throw new Error("Failed to create user.");
    }
}

//Updates an existing user record. 
export async function updateUser(clerkId: string, user: UserUpdateType) {

    try {
        await connectDB();
        const updatedUser = await User.findOneAndUpdate(
            { clerkId: clerkId },
            { $set: user },
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

// Deletes a user record. 
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
        console.error("Error deleting user:", (error as Error).message);
        throw new Error("Failed to delete user.");
    }
}

//Retrieves a user record by Clerk ID.
export async function getUser(userId: string) {
    try{
        await connectDB();
        const user = await User.findOne({
            clerkId: userId
        });
        return JSON.parse(JSON.stringify(user));
    } catch (error) {
        console.error("Error finding user id:", (error as Error).message);
        throw new Error("Failed to fetch ClerkId.");
    }
}