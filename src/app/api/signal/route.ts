import { NextRequest, NextResponse } from "next/server";
import { getSeriesOrSimulated } from "@/lib/forexData";
import { generateSignalFromSeries } from "@/lib/ai";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") || "EURUSD").toUpperCase();
    const timeframe = (searchParams.get("timeframe") || "5min") as
      | "1min"
      | "5min"
      | "15min"
      | "30min"
      | "60min";

    const series = await getSeriesOrSimulated(symbol, timeframe, "compact");
    const signal = await generateSignalFromSeries(symbol, timeframe, series);
    return NextResponse.json({ ok: true, signal, candles: series.slice(-120) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
