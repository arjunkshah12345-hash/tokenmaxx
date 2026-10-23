import { NextResponse } from "next/server";
import { connectProvider } from "@/lib/store";

/** Dedicated T3 Code linkup — autoconnects every viaT3 provider in one shot. */
export async function POST() {
  const result = await connectProvider("t3code");
  return NextResponse.json({
    ...result,
    message: `T3 Code linked. Autoconnected ${result.connected.length - 1} providers.`,
  });
}
