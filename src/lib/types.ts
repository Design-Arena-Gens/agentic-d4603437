export type Candlestick = {
  time: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type PriceSeries = Candlestick[];

export type SymbolPair = {
  base: string; // e.g., EUR
  quote: string; // e.g., USD
};

export type IndicatorBundle = {
  rsi14?: number[];
  smaFast?: number[];
  smaSlow?: number[];
  macd?: { MACD: number[]; signal: number[]; histogram: number[] };
};

export type Signal = {
  symbol: string; // e.g., EURUSD
  timeframe: string; // e.g., 5min
  side: "buy" | "sell" | "flat";
  confidence: number; // 0..1
  indicators: IndicatorBundle;
  latestCandle?: Candlestick;
};

export type ExecutionResult = {
  executed: boolean;
  mode: "metaapi" | "webhook" | "paper";
  details: any;
};

export type TradeRequest = {
  symbol: string; // e.g., EURUSD
  side: "buy" | "sell";
  lotSize: number; // in lots (e.g., 0.1)
  stopLossPips?: number;
  takeProfitPips?: number;
};

export type BotRunRequest = {
  symbol: string;
  timeframe?: "1min" | "5min" | "15min" | "30min" | "60min";
  lotSize?: number;
  autoExecute?: boolean;
};
