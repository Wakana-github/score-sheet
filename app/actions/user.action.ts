"use server";

import User from "../server/models/user.modal";
import connectDB from '../server/helper/score-sheet-db.mjs'; 

export async function createUser(user: any){
    try{
        await connectDB();
        const newUser = await User.create(user);
        return JSON.parse(JSON.stringify(newUser));

        } catch(error){
        console.log(error);
    }
}