// Live gold/silver pricing, sourced from Yahoo Finance's public chart API
// (COMEX futures GC=F / SI=F, no API key required) and converted from
// USD/troy-oz to INR/gram using Frankfurter's free FX rates.

const GRAMS_PER_TROY_OUNCE = 31.1034768;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

type YahooChartResponse = {
  chart: {
    result: [
      {
        meta: { regularMarketPrice: number; chartPreviousClose: number };
        timestamp?: number[];
        indicators: { quote: [{ close: (number | null)[] }] };
      },
    ] | null;
    error: unknown;
  };
};

async function fetchYahooChart(
  symbol: string,
  range: string,
  interval: string,
  revalidateSeconds: number
) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) throw new Error(`Yahoo Finance request failed for ${symbol} (${res.status})`);
  const data = (await res.json()) as YahooChartResponse;
  const result = data.chart.result?.[0];
  if (!result) throw new Error(`Yahoo Finance returned no data for ${symbol}`);
  return result;
}

async function fetchUsdInrRate(): Promise<number> {
  const res = await fetch("https://api.frankfurter.dev/v1/latest?from=USD&to=INR", {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("Exchange rate request failed");
  const data = (await res.json()) as { rates: { INR: number } };
  return data.rates.INR;
}

export type MetalQuote = {
  pricePerGramINR: number;
  pricePer10gINR: number;
  changePercentToday: number;
};

export type MetalHistoryPoint = { date: string; gold: number; silver: number };

export type MetalMarketData = {
  gold: MetalQuote;
  silver: MetalQuote;
  history: MetalHistoryPoint[];
  fetchedAt: Date;
};

function toQuote(priceUSD: number, prevCloseUSD: number, usdInr: number): MetalQuote {
  const pricePerGramINR = (priceUSD / GRAMS_PER_TROY_OUNCE) * usdInr;
  const changePercentToday =
    prevCloseUSD > 0 ? ((priceUSD - prevCloseUSD) / prevCloseUSD) * 100 : 0;
  return {
    pricePerGramINR,
    pricePer10gINR: pricePerGramINR * 10,
    changePercentToday,
  };
}

export async function getMetalMarketData(): Promise<MetalMarketData> {
  const [goldNow, silverNow, goldHistory, silverHistory, usdInr] = await Promise.all([
    fetchYahooChart("GC=F", "5d", "1d", 300),
    fetchYahooChart("SI=F", "5d", "1d", 300),
    fetchYahooChart("GC=F", "6mo", "1wk", 3600),
    fetchYahooChart("SI=F", "6mo", "1wk", 3600),
    fetchUsdInrRate(),
  ]);

  const gold = toQuote(goldNow.meta.regularMarketPrice, goldNow.meta.chartPreviousClose, usdInr);
  const silver = toQuote(
    silverNow.meta.regularMarketPrice,
    silverNow.meta.chartPreviousClose,
    usdInr
  );

  const goldCloses = goldHistory.indicators.quote[0].close;
  const silverCloses = silverHistory.indicators.quote[0].close;
  const timestamps = goldHistory.timestamp ?? [];
  const gramsToInrPer10g = (usd: number) => (usd / GRAMS_PER_TROY_OUNCE) * usdInr * 10;

  const history: MetalHistoryPoint[] = timestamps
    .map((ts, i) => {
      const goldClose = goldCloses[i];
      const silverClose = silverCloses[i];
      if (goldClose == null || silverClose == null) return null;
      return {
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        gold: gramsToInrPer10g(goldClose),
        silver: gramsToInrPer10g(silverClose),
      };
    })
    .filter((point): point is MetalHistoryPoint => point !== null);

  return { gold, silver, history, fetchedAt: new Date() };
}
