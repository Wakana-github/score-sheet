import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

//Check if the request is coming from the origin
// CSRF token generation & verification

const ALLOWED_ORIGINS: string[] = (process.env.CLIENT_ORIGIN || "")
  .split(',')
  .map(url => url.trim())
  .filter(url => url.length > 0);

export function verifyRequestOrigin(request: Request): NextResponse | null {
  //skip if it's GET request or when there origin is not set
  if (request.method === 'GET' || ALLOWED_ORIGINS.length === 0) {
    return null; // OK
  }
  //Get header
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  //Check if Origin header exists
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) {
      return null; // allowed origin:OK
    } else {
      console.error(`Blocked request from unauthorized origin`);
      return NextResponse.json(
        { message: 'Invalid request origin.' }, 
        { status: 403 }
      );
    }
  }

  //Fallback check when Origin header is missing
  //Must have a Host header to proceed with same-site check
  if (!host) {
    console.error('Blocked request due to missing Host header.');
    return NextResponse.json(
      { message: 'Missing Host header.' }, 
      { status: 403 }
    );
  }
// Check Referer header
  if (referer) {
    // check if the part of referer host maches with Host 
    try {
      const refererUrl = new URL(referer);
      
      // Allow if the host part of the Referer matches the current Host
      if (refererUrl.host === host) {
        return null; //OK
      }
      
      console.error(`Blocked request: Referer host (${refererUrl.host}) does not match Host.`);
      //Referer exists but hosts don't match -> Block
      return NextResponse.json(
        { message: 'Invalid request referer.' }, 
        { status: 403 }
      );

    } catch (e) {
      // Invalid Referer URL format
      console.error('Blocked request: Invalid Referer URL format.');
      return NextResponse.json(
        { message: 'Invalid request format.' }, 
        { status: 403 }
      );
    }
  }

  // Block if both Origin and Referer are missing (as external tool or an intentionally malicious request)
  console.error('Blocked request: Missing both Origin and Referer headers.');
  return NextResponse.json(
    { message: 'Missing origin or referer for non-GET request.' }, 
    { status: 403 }
  );
}

//Not nesessary when there is Clerk authentication??
//------- Generate CSRF Token---------------
export async function generateCsrfToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 30); // Time limit 30 mins
  const cookieStore = await cookies(); 
  cookieStore.set("csrf_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires,
    path: "/",
  });
  return token;
}

//-----------Validate CSRF Token------------------
export async function verifyCsrfToken(request: Request) {
  if (request.method === "GET") return null;
  const cookieStore = await cookies();
  const storedToken = cookieStore.get("csrf_token")?.value;
  const headerToken = request.headers.get("x-csrf-token");
  if (!storedToken || !headerToken || storedToken !== headerToken) {
    return NextResponse.json({ message: "Invalid CSRF token." }, { status: 403 });
  }
  return null;
}