import { PriceSeries, IndicatorBundle } from "@/lib/types";
import { RSI, SMA, MACD } from "technicalindicators";

export function computeIndicators(series: PriceSeries): IndicatorBundle {
  const closes = series.map((c) => c.close);

  const rsi14 = RSI.calculate({ period: 14, values: closes });
  const smaFast = SMA.calculate({ period: 20, values: closes });
  const smaSlow = SMA.calculate({ period: 50, values: closes });
  const macdRaw = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const macd = {
    MACD: macdRaw.map((x) => x.MACD ?? 0),
    signal: macdRaw.map((x) => x.signal ?? 0),
    histogram: macdRaw.map((x) => x.histogram ?? 0),
  };

  return { rsi14, smaFast, smaSlow, macd };
}

export function latestIndicatorValues(ind: IndicatorBundle) {
  const last = <T>(arr?: T[]) => (arr && arr.length > 0 ? arr[arr.length - 1] : undefined);
  return {
    rsi14: last(ind.rsi14),
    smaFast: last(ind.smaFast),
    smaSlow: last(ind.smaSlow),
    macd: {
      MACD: last(ind.macd?.MACD),
      signal: last(ind.macd?.signal),
      histogram: last(ind.macd?.histogram),
    },
  };
}
