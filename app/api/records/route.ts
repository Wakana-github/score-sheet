// app/api/records/route.ts　 PROXY for all records

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.INTERNAL_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('INTERNAL_API_BASE_URL is not defined in environment variables.');
}

// GET:Fetch all records
export async function GET(request: Request) {
  const { userId, getToken } =await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await getToken({ template: 'long_lasting' }); 
    const url = new URL(request.url);
    const searchParams = url.search;

    const externalUrl = `${API_BASE_URL}/records${searchParams}`;

    const res = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({ message: 'Cannot parse backend response.' }));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Proxy GET /records failed:", error);
    return NextResponse.json({ message: 'An unknown server error occurred during GET.' }, { status: 500 });
  }
}

//Create new record
export async function POST(request: Request) {
  const { userId, getToken } =await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const token = await getToken({ template: 'long_lasting' });

    const res = await fetch(`${API_BASE_URL}/records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({ message: 'Cannot parse backend response.' }));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Proxy POST /records failed:", error);
    return NextResponse.json({ message: 'An unknown server error occurred during POST.' }, { status: 500 });
  }
}