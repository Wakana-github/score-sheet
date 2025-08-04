"use server";

import User, {UserCreationType} from "../server/models/user.modal";
import connectDB from '../server/helper/score-sheet-db'; 
// import { User } from "@clerk/nextjs/server";


export async function createUser(user:UserCreationType ){
    try{
        await connectDB();
        const newUser = await User.create(user);
        return JSON.parse(JSON.stringify(newUser));

        } catch(error){
        console.log(error);
    }
}