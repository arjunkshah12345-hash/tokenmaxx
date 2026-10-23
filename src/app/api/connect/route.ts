import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_MAP } from "@/lib/providers";
import { connectProvider, disconnectProvider } from "@/lib/store";
import type { ProviderId } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { providerId?: string; action?: string };
  const providerId = body.providerId as ProviderId | undefined;
  if (!providerId || !PROVIDER_MAP[providerId]) {
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  }

  if (body.action === "disconnect") {
    const you = await disconnectProvider(providerId);
    return NextResponse.json({ you });
  }

  const result = await connectProvider(providerId);
  return NextResponse.json(result);
}
