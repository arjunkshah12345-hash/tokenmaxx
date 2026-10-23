import { NextResponse } from "next/server";
import { syncNow } from "@/lib/store";

export async function POST() {
  const result = await syncNow();
  return NextResponse.json(result);
}
