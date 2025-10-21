import mongoose from 'mongoose';

//Checks if a given string is a valid MongoDB ObjectId format.

export const isValidMongoId = (id: string): boolean => {
    if (!id || typeof id !== 'string') {
        return false;
    }
        return mongoose.Types.ObjectId.isValid(id);
};