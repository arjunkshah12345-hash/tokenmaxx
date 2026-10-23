import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/store";
import type { Period } from "@/lib/types";

const VALID: Period[] = ["hourly", "daily", "weekly", "monthly"];

export async function GET(req: NextRequest) {
  const period = (req.nextUrl.searchParams.get("period") ?? "daily") as Period;
  if (!VALID.includes(period)) {
    return NextResponse.json({ error: "invalid period" }, { status: 400 });
  }
  const board = await getLeaderboard(period);
  return NextResponse.json(board);
}
