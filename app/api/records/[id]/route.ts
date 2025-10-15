// app/api/records/[id]/route.ts　　

/* Individual score record API proxy endpoint (GET, PUT, DELETE).
* This route handles all operations for a specific record identified by its ID (`[id]`) 
* by serving as a secure gateway to the internal backend API
*/
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


const API_BASE_URL = process.env.INTERNAL_API_BASE_URL; 
if (!API_BASE_URL) {
  throw new Error('INTERNAL_API_BASE_URL is not defined in environment variables.');
}


type RouteContext = {
  params: Promise<{ id: string }>;
};

// Fetch a single record by ID
export async function GET(request: Request, context: RouteContext){
  const { id } = await context.params;
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await getToken({ template: 'long_lasting' });
    const externalUrl = `${API_BASE_URL}/records/${id}`;

     const res = await fetch(externalUrl, {
      method: "GET", 
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Disable cache for dynamic record fetching
    });

    // Forward the response directly from the backend
    const data = await res.json().catch(() => ({ message: 'Cannot parse backend response.' }));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
     console.error("Proxy GET /records/[id] failed:", error);
    return NextResponse.json(
      { message: "An unknown server error occurred during GET." },
      { status: 500 }
    );
  }
}



// Update a record by ID
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const authData = await auth();
  const { userId, getToken } = authData;

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Retrieve update data from the request body
    const body = await request.json();
    
    const token = await getToken({ template: 'long_lasting' });
    const externalUrl = `${API_BASE_URL}/records/${id}`; // Backend update endpoint

    const res = await fetch(externalUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, 
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    
    // Forward the response directly from the backend
    // Safely parse, considering the possibility of no body on success (200/204) or error
    const data = await res.json().catch(() => ({})); 

    return NextResponse.json(data, { status: res.status });

  } catch (error) {
    console.error("Proxy PUT /records/[id] failed:", error);
    return NextResponse.json(
      { message: "Internal proxy error" },
      { status: 500 }
    );
  }
}


// Delete a record by ID
export async function DELETE(request: Request, context: RouteContext){
  const { id } = await context.params;
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

   try {
    const token = await getToken({ template: 'long_lasting' });
    const externalUrl = `${API_BASE_URL}/records/${id}`;

    const res = await fetch(externalUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    // Properly forward error responses
    const data = await res.json().catch(() => ({})); 
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Proxy DELETE /records/[id] failed:", error);
    return NextResponse.json(
      { message: "An unknown server error occurred during DELETE." },
      { status: 500 }
    );
  }
}