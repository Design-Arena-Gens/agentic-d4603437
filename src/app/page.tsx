"use client";
import { useEffect, useMemo, useState } from "react";

type Signal = {
  symbol: string;
  timeframe: string;
  side: "buy" | "sell" | "flat";
  confidence: number;
  latestCandle?: { time: number; close: number };
};

export default function Home() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("5min");
  const [lotSize, setLotSize] = useState(0.1);
  const [autoExecute, setAutoExecute] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [candles, setCandles] = useState<{ time: number; close: number }[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (m: string) => setLog((l) => [new Date().toLocaleTimeString() + " " + m, ...l].slice(0, 50));

  const fetchSignal = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/signal?symbol=${symbol}&timeframe=${timeframe}`);
      const json = await res.json();
      if (json.ok) {
        setSignal(json.signal);
        setCandles((json.candles || []).map((c: any) => ({ time: c.time, close: c.close })));
        addLog(`Signal: ${json.signal.side} (${(json.signal.confidence * 100).toFixed(1)}%)`);
      } else {
        addLog(`Signal error: ${json.error}`);
      }
    } catch (e: any) {
      addLog(`Signal failed: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const runBot = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, timeframe, lotSize, autoExecute }),
      });
      const json = await res.json();
      if (json.ok) {
        setSignal(json.signal);
        addLog(
          `Bot: ${json.signal.side} (${(json.signal.confidence * 100).toFixed(1)}%)` +
            (json.execution ? ` | executed via ${json.execution.mode}` : " | not executed")
        );
      } else {
        addLog(`Bot error: ${json.error}`);
      }
    } catch (e: any) {
      addLog(`Bot failed: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const chartPath = useMemo(() => {
    if (!candles.length) return "";
    const w = 600;
    const h = 200;
    const times = candles.map((c) => c.time);
    const prices = candles.map((c) => c.close);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const t0 = Math.min(...times);
    const t1 = Math.max(...times);
    const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * (w - 20) + 10;
    const y = (p: number) => h - ((p - minP) / (maxP - minP || 1)) * (h - 20) - 10;
    return candles
      .map((c, i) => `${i === 0 ? "M" : "L"}${x(c.time).toFixed(1)},${y(c.close).toFixed(1)}`)
      .join(" ");
  }, [candles]);

  useEffect(() => {
    fetchSignal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-semibold">AI Forex Trading Bot</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Generate AI-driven signals and optionally auto-execute via MetaApi/webhook/paper.
        </p>

        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-lg font-medium">Settings</h2>
            <label className="mt-3 block text-sm">Symbol</label>
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white p-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="EURUSD"
            />
            <label className="mt-3 block text-sm">Timeframe</label>
            <select
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white p-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              {[
                ["1min", "1 min"],
                ["5min", "5 min"],
                ["15min", "15 min"],
                ["30min", "30 min"],
                ["60min", "60 min"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <label className="mt-3 block text-sm">Lot Size</label>
            <input
              type="number"
              step="0.01"
              min={0.01}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white p-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              value={lotSize}
              onChange={(e) => setLotSize(Number(e.target.value))}
            />
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoExecute} onChange={(e) => setAutoExecute(e.target.checked)} />
              Auto Execute Trade
            </label>
            <div className="mt-4 flex gap-2">
              <button
                onClick={fetchSignal}
                className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black"
                disabled={loading}
              >
                {loading ? "Loading..." : "Compute Signal"}
              </button>
              <button
                onClick={runBot}
                className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700"
                disabled={loading}
              >
                {loading ? "Running..." : "Run Bot"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 p-4 md:col-span-2 dark:border-zinc-800">
            <h2 className="text-lg font-medium">Signal</h2>
            {signal ? (
              <div className="mt-2">
                <div className="text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="font-mono">{signal.symbol}</span> {signal.timeframe} ?
                  <span className="ml-2 font-semibold uppercase">{signal.side}</span>
                  <span className="ml-2">({(signal.confidence * 100).toFixed(1)}%)</span>
                </div>
                <div className="mt-4">
                  <svg viewBox="0 0 600 200" className="h-48 w-full">
                    <rect x="0" y="0" width="600" height="200" fill="transparent" />
                    <path d={chartPath} stroke="#16a34a" strokeWidth="2" fill="none" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-zinc-500">No signal yet.</div>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-medium">Activity</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {log.map((l, i) => (
              <li key={i} className="text-zinc-600 dark:text-zinc-400">
                {l}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
