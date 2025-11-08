import { ExecutionResult, TradeRequest } from "@/lib/types";

export async function executeTrade(req: TradeRequest): Promise<ExecutionResult> {
  const useMetaApi = !!process.env.METAAPI_TOKEN && !!process.env.METAAPI_ACCOUNT_ID;
  if (useMetaApi) {
    try {
      const res = await executeViaMetaApi(req);
      return { executed: true, mode: "metaapi", details: res };
    } catch (e: any) {
      // fall through to webhook then paper
    }
  }

  const webhook = process.env.TRADE_WEBHOOK_URL;
  if (webhook) {
    try {
      const r = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req, ts: Date.now() }),
      });
      const body = await r.text();
      return { executed: r.ok, mode: "webhook", details: { status: r.status, body } };
    } catch (e: any) {
      // fall through to paper
    }
  }

  return {
    executed: true,
    mode: "paper",
    details: { message: "Paper trade executed (simulation)", request: req },
  };
}

async function executeViaMetaApi(req: TradeRequest) {
  const { default: MetaApi } = await import("metaapi.cloud-sdk");
  const token = process.env.METAAPI_TOKEN!;
  const accountId = process.env.METAAPI_ACCOUNT_ID!;

  const api = new MetaApi(token);
  const account = await api.metatraderAccountApi.getAccount(accountId);
  const connection = account.getRPCConnection();
  await connection.connect();
  await connection.waitSynchronized();

  const sl = req.stopLossPips ? await priceWithPips(connection, req.symbol, req.side === "buy" ? -req.stopLossPips : req.stopLossPips) : undefined;
  const tp = req.takeProfitPips ? await priceWithPips(connection, req.symbol, req.side === "buy" ? req.takeProfitPips : -req.takeProfitPips) : undefined;

  const result =
    req.side === "buy"
      ? await connection.createMarketBuyOrder(req.symbol, req.lotSize, sl, tp, { comment: "agentic-bot" })
      : await connection.createMarketSellOrder(req.symbol, req.lotSize, sl, tp, { comment: "agentic-bot" });

  await connection.close();
  return result;
}

async function priceWithPips(connection: any, symbol: string, pips: number) {
  const price = await connection.getSymbolPrice(symbol);
  const point = await connection.getSymbolSpecification(symbol).then((s: any) => s.point);
  const pipValue = 10 * point; // MT5: 1 pip = 10 points for most FX
  const adj = pips * pipValue;
  const base = pips >= 0 ? price.ask : price.bid;
  return +(base + adj).toFixed(5);
}
