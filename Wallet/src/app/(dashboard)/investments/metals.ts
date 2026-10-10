import { prisma } from "@/lib/prisma";
import { getMetalMarketData, type MetalMarketData } from "@/lib/metalPrices";
import { toNumber } from "@/lib/utils";
import { returnPercent } from "@/lib/finance";

export type MetalAggregate = {
  hasHolding: boolean;
  holdingGrams: number;
  investedValue: number;
  currentValue: number;
  sincePurchasePct: number;
  pricePer10gINR: number;
  changePercentToday: number;
};

export type MetalPanelData = {
  gold: MetalAggregate;
  silver: MetalAggregate;
  history: MetalMarketData["history"];
  fetchedAt: Date;
};

/**
 * Always fetches live gold/silver market quotes for the panel. When the user
 * holds GOLD/SILVER investments with a known quantity, those are also
 * re-priced against the live quote and persisted.
 */
export async function syncAndAggregateMetalHoldings(userId: string): Promise<MetalPanelData> {
  const [metalInvestments, market] = await Promise.all([
    prisma.investment.findMany({ where: { userId, type: { in: ["GOLD", "SILVER"] } } }),
    getMetalMarketData(),
  ]);

  async function aggregate(type: "GOLD" | "SILVER"): Promise<MetalAggregate> {
    const rows = metalInvestments.filter((inv) => inv.type === type);
    const quote = type === "GOLD" ? market.gold : market.silver;

    let holdingGrams = 0;
    let investedValue = 0;
    let currentValue = 0;

    for (const inv of rows) {
      investedValue += toNumber(inv.amountInvested);
      const grams = inv.quantityGrams != null ? toNumber(inv.quantityGrams) : null;

      if (grams !== null) {
        const freshValue = grams * quote.pricePerGramINR;
        holdingGrams += grams;
        currentValue += freshValue;
        if (Math.abs(freshValue - toNumber(inv.currentValue)) > 0.01) {
          await prisma.investment.update({
            where: { id: inv.id },
            data: { currentValue: freshValue },
          });
        }
      } else {
        currentValue += toNumber(inv.currentValue);
      }
    }

    return {
      hasHolding: rows.length > 0,
      holdingGrams,
      investedValue,
      currentValue,
      sincePurchasePct: returnPercent({ invested: investedValue, currentValue }),
      pricePer10gINR: quote.pricePer10gINR,
      changePercentToday: quote.changePercentToday,
    };
  }

  const [gold, silver] = await Promise.all([aggregate("GOLD"), aggregate("SILVER")]);

  return { gold, silver, history: market.history, fetchedAt: market.fetchedAt };
}
