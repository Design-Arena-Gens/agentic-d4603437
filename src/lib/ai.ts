import * as tf from "@tensorflow/tfjs";
import { PriceSeries, IndicatorBundle, Signal } from "@/lib/types";
import { computeIndicators, latestIndicatorValues } from "@/lib/indicators";

function buildFeatures(series: PriceSeries, indicators: IndicatorBundle) {
  const closes = series.map((c) => c.close);
  const features: number[][] = [];
  const labels: number[] = [];

  const len = closes.length;
  const maxLookback = Math.max(
    indicators.rsi14?.length ?? 0,
    indicators.smaFast?.length ?? 0,
    indicators.smaSlow?.length ?? 0,
    indicators.macd?.MACD.length ?? 0
  );

  // Align indicator arrays to the end of series
  const offset = len - Math.max(0, maxLookback);

  for (let i = offset; i < len - 1; i++) {
    const close = closes[i];
    const nextClose = closes[i + 1];

    const rsi = indicators.rsi14?.[i - (len - (indicators.rsi14?.length ?? 0))] ?? NaN;
    const smaF = indicators.smaFast?.[i - (len - (indicators.smaFast?.length ?? 0))] ?? NaN;
    const smaS = indicators.smaSlow?.[i - (len - (indicators.smaSlow?.length ?? 0))] ?? NaN;
    const macdH = indicators.macd?.histogram[i - (len - (indicators.macd?.histogram.length ?? 0))] ?? NaN;

    if ([rsi, smaF, smaS, macdH].some((v) => !isFinite(v))) continue;

    const smaDiff = smaF - smaS;
    const ret1 = i > 0 ? (close - closes[i - 1]) / closes[i - 1] : 0;

    features.push([rsi, smaDiff, macdH, ret1]);
    labels.push(nextClose > close ? 1 : 0);
  }
  return { features, labels };
}

function createModel(inputDim: number) {
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 16, inputShape: [inputDim], activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 8, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
  model.compile({ optimizer: tf.train.adam(0.01), loss: "binaryCrossentropy", metrics: ["accuracy"] });
  return model;
}

export async function generateSignalFromSeries(
  symbol: string,
  timeframe: string,
  series: PriceSeries
): Promise<Signal> {
  const indicators = computeIndicators(series);
  const { features, labels } = buildFeatures(series, indicators);

  let side: Signal["side"] = "flat";
  let confidence = 0.5;

  if (features.length > 20) {
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels.map((y) => [y]));
    const model = createModel(xs.shape[1]!);
    await model.fit(xs, ys, { epochs: 20, batchSize: 16, verbose: 0 });

    const last = features[features.length - 1];
    const pred = (model.predict(tf.tensor2d([last])) as tf.Tensor).dataSync()[0];
    confidence = Math.max(0, Math.min(1, pred));
    side = confidence > 0.55 ? "buy" : confidence < 0.45 ? "sell" : "flat";
    xs.dispose();
    ys.dispose();
  } else {
    const latest = latestIndicatorValues(indicators);
    const smaDiff = (latest.smaFast ?? 0) - (latest.smaSlow ?? 0);
    const macdH = latest.macd.histogram ?? 0;
    const rsi = latest.rsi14 ?? 50;
    const score = (smaDiff > 0 ? 0.2 : -0.2) + (macdH > 0 ? 0.2 : -0.2) + ((rsi - 50) / 50) * 0.2;
    side = score > 0.1 ? "buy" : score < -0.1 ? "sell" : "flat";
    confidence = Math.min(1, Math.abs(score));
  }

  return {
    symbol,
    timeframe,
    side,
    confidence,
    indicators,
    latestCandle: series[series.length - 1],
  };
}
