import {NextResponse} from "next/server";
import {generateCsrfToken} from "@/app/lib/security";

//Function to generatew token
export async function GET(){
    const token = await generateCsrfToken();
    return NextResponse.json({token}); //return token to the client
}