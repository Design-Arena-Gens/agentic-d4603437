import { NextRequest, NextResponse } from "next/server";
import { getSeriesOrSimulated } from "@/lib/forexData";
import { generateSignalFromSeries } from "@/lib/ai";
import { executeTrade } from "@/lib/tradeExecutor";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const symbol = (body.symbol || "EURUSD").toUpperCase();
    const timeframe = (body.timeframe || "5min") as "1min" | "5min" | "15min" | "30min" | "60min";
    const lotSize = Number(body.lotSize ?? process.env.DEFAULT_LOT_SIZE ?? 0.1);
    const autoExecute = Boolean(
      body.autoExecute ?? (process.env.AUTO_TRADE_ENABLED === "true" || process.env.AUTO_TRADE_ENABLED === "1")
    );

    const series = await getSeriesOrSimulated(symbol, timeframe, "compact");
    const signal = await generateSignalFromSeries(symbol, timeframe, series);

    let execution = null;
    if (autoExecute && (signal.side === "buy" || signal.side === "sell")) {
      execution = await executeTrade({ symbol, side: signal.side, lotSize });
    }

    return NextResponse.json({ ok: true, signal, execution });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Allow GET to run the bot without executing trades (preview only)
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "EURUSD").toUpperCase();
  const timeframe = (searchParams.get("timeframe") || "5min") as "1min" | "5min" | "15min" | "30min" | "60min";
  const lotSize = Number(searchParams.get("lotSize") ?? 0.1);

  const series = await getSeriesOrSimulated(symbol, timeframe, "compact");
  const signal = await generateSignalFromSeries(symbol, timeframe, series);
  return NextResponse.json({ ok: true, signal, execution: null, lotSize });
}
