import { NextRequest, NextResponse } from "next/server";
import { getYou, setHandle } from "@/lib/store";

export async function GET() {
  const you = await getYou();
  return NextResponse.json({ you });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { handle?: string };
  if (!body.handle) {
    return NextResponse.json({ error: "handle required" }, { status: 400 });
  }
  try {
    const you = await setHandle(body.handle);
    return NextResponse.json({ you });
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
