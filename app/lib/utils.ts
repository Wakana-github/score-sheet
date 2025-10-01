import mongoose from 'mongoose';

export const isValidMongoId = (id: string): boolean => {
    if (!id || typeof id !== 'string') {
        return false;
    }
        return mongoose.Types.ObjectId.isValid(id);
};