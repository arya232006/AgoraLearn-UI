import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // Mock API route disabled. Requests should go to backend at http://localhost:3000/api/converse
  return NextResponse.json({ error: "This route is disabled. Use backend API." }, { status: 404 })
}
