import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json({ message: "HR Status endpoint" }, { status: 200 });
}

export async function GET(req: Request) {
  return NextResponse.json({ message: "HR Status endpoint" }, { status: 200 });
}
