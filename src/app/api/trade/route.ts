import { NextRequest, NextResponse } from "next/server";
import { executeTrade } from "@/lib/tradeExecutor";
import { TradeRequest } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TradeRequest;
    if (!body?.symbol || !body?.side || !body?.lotSize) {
      return NextResponse.json({ ok: false, error: "symbol, side, lotSize required" }, { status: 400 });
    }
    const result = await executeTrade(body);
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
