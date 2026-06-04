import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Fire and forget, no real validation needed in mock
  return NextResponse.json({ success: true });
}
