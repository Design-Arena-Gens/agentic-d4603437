import { PriceSeries, Candlestick, SymbolPair } from "@/lib/types";

const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";

export function parseSymbol(symbol: string): SymbolPair {
  const s = symbol.replace(/[\s/]/g, "").toUpperCase();
  if (s.length !== 6) throw new Error(`Unsupported symbol format: ${symbol}`);
  return { base: s.slice(0, 3), quote: s.slice(3, 6) };
}

export async function fetchAlphaVantageIntraday(
  symbol: string,
  interval: "1min" | "5min" | "15min" | "30min" | "60min",
  outputSize: "compact" | "full" = "compact"
): Promise<PriceSeries> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) throw new Error("ALPHA_VANTAGE_API_KEY not set");
  const { base, quote } = parseSymbol(symbol);
  const url = `${ALPHA_VANTAGE_BASE}?function=FX_INTRADAY&from_symbol=${base}&to_symbol=${quote}&interval=${interval}&outputsize=${outputSize}&apikey=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`AlphaVantage error: ${res.status}`);
  const json = await res.json();
  const tsKey = Object.keys(json).find((k) => k.includes("Time Series"));
  if (!tsKey) throw new Error("Unexpected AlphaVantage response");
  const timeSeries = json[tsKey];
  const candles: Candlestick[] = Object.entries<any>(timeSeries)
    .map(([timeStr, ohlc]) => ({
      time: new Date(timeStr + "Z").getTime(),
      open: parseFloat(ohlc["1. open"]),
      high: parseFloat(ohlc["2. high"]),
      low: parseFloat(ohlc["3. low"]),
      close: parseFloat(ohlc["4. close"]),
      volume: parseFloat(ohlc["5. volume"]) || undefined,
    }))
    .sort((a, b) => a.time - b.time);
  return candles;
}

export async function getSeriesOrSimulated(
  symbol: string,
  interval: "1min" | "5min" | "15min" | "30min" | "60min",
  outputSize: "compact" | "full" = "compact"
): Promise<PriceSeries> {
  try {
    return await fetchAlphaVantageIntraday(symbol, interval, outputSize);
  } catch (err) {
    // Fallback to simulated random-walk data for demo if no API key
    const now = Date.now();
    const stepMs = (() => {
      switch (interval) {
        case "1min":
          return 60_000;
        case "5min":
          return 5 * 60_000;
        case "15min":
          return 15 * 60_000;
        case "30min":
          return 30 * 60_000;
        case "60min":
          return 60 * 60_000;
      }
    })();
    const points = outputSize === "full" ? 1000 : 120;
    const basePrice = 1.1000;
    let price = basePrice;
    const candles: Candlestick[] = [];
    for (let i = points - 1; i >= 0; i--) {
      const t = now - i * stepMs;
      const drift = (Math.random() - 0.5) * 0.0006;
      const open = price;
      price = Math.max(0.2, price + drift);
      const close = price;
      const high = Math.max(open, close) + Math.random() * 0.0002;
      const low = Math.min(open, close) - Math.random() * 0.0002;
      candles.push({ time: t, open, high, low, close });
    }
    return candles;
  }
}
