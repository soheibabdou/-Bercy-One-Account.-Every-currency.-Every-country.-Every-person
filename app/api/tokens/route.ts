import { NextRequest, NextResponse } from "next/server";
import type { Position } from "@/lib/portfolio";

const DATA_BASE = "https://api.g.alchemy.com/data/v1";
const NETWORKS = ["eth-mainnet", "base-mainnet", "solana-mainnet"] as const;

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type TokenPrice = { currency: string; value: string };
type AlchemyToken = {
  network?: string;
  tokenAddress?: string | null;
  tokenBalance?: string;
  tokenMetadata?: {
    symbol?: string | null;
    name?: string | null;
    decimals?: number | string | null;
    logo?: string | null;
  };
  tokenPrices?: TokenPrice[];
};

function isWalletAddress(v: string) {
  return EVM_ADDRESS.test(v) || SOLANA_ADDRESS.test(v);
}

function nativeSymbol(network: string) {
  if (network.includes("solana")) return "SOL";
  return "ETH";
}

function nativeDecimals(network: string) {
  if (network.includes("solana")) return 9;
  return 18;
}

function formatUnits(atomic: string, decimals: number): string {
  let bi: bigint;
  if (atomic.startsWith("0x")) {
    bi = BigInt(atomic);
  } else if (/^\d+$/.test(atomic)) {
    bi = BigInt(atomic);
  } else {
    return "0";
  }

  const d = Math.max(0, Math.min(36, Number.isFinite(decimals) ? decimals : 18));
  const base = BigInt(10) ** BigInt(d);
  const whole = bi / base;
  const frac = bi % base;
  if (frac === 0n) return whole.toString();
  let fracStr = frac.toString().padStart(d, "0");
  fracStr = fracStr.replace(/0+$/, "");
  return `${whole.toString()}.${fracStr}`;
}

function toNumber(dec: string): number {
  const trimmed = dec.length > 24 ? dec.slice(0, 24) : dec;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

function pickUsdPrice(tokenPrices?: TokenPrice[]) {
  const p = tokenPrices?.find((x) => x.currency?.toLowerCase() === "usd");
  if (!p) return null;
  const num = Number(p.value);
  return Number.isFinite(num) ? num : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { address?: unknown };
    const address = typeof body.address === "string" ? body.address.trim() : "";

    if (!address || !isWalletAddress(address)) {
      return NextResponse.json(
        { error: "Invalid or missing address" },
        { status: 400 },
      );
    }

    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ALCHEMY_API_KEY" },
        { status: 500 },
      );
    }

    const url = `${DATA_BASE}/${apiKey}/assets/tokens/by-address`;
    const baseBody = {
      addresses: [{ address, networks: [...NETWORKS] }],
      withMetadata: true,
      withPrices: true,
      includeNativeTokens: true,
      includeErc20Tokens: true,
    };

    const tokens: AlchemyToken[] = [];
    let pageKey: string | undefined;

    do {
      const payload = pageKey ? { ...baseBody, pageKey } : baseBody;
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      if (!r.ok) {
        const text = await r.text();
        return NextResponse.json(
          { error: "Alchemy Data error", detail: text },
          { status: 502 },
        );
      }

      const j = (await r.json()) as {
        data?: { tokens?: AlchemyToken[]; pageKey?: string };
      };
      tokens.push(...(j.data?.tokens ?? []));
      pageKey = j.data?.pageKey || undefined;
    } while (pageKey);

    const positions: Position[] = tokens
      .map((t) => {
        const network = t.network || "eth-mainnet";
        const meta = t.tokenMetadata ?? {};
        const isNative = t.tokenAddress == null;
        const decimals =
          typeof meta.decimals === "number" && meta.decimals !== null
            ? meta.decimals
            : meta.decimals != null && Number.isFinite(Number(meta.decimals))
              ? Number(meta.decimals)
              : nativeDecimals(network);

        const atomic = String(t.tokenBalance ?? "0");
        const balanceStr = formatUnits(atomic, decimals);
        const balanceNum = toNumber(balanceStr);
        const priceUsd = pickUsdPrice(t.tokenPrices);
        const valueUsd = priceUsd != null ? balanceNum * priceUsd : null;

        return {
          network,
          contractAddress: t.tokenAddress ?? null,
          symbol: meta.symbol ?? (isNative ? nativeSymbol(network) : "TOKEN"),
          name: meta.name ?? null,
          logo: meta.logo ?? null,
          decimals,
          balance: balanceStr,
          priceUsd,
          valueUsd,
        };
      })
      .filter((p) => toNumber(p.balance) > 0)
      .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));

    const totalValue = positions.reduce((acc, p) => acc + (p.valueUsd ?? 0), 0);

    return NextResponse.json(
      {
        address,
        networks: NETWORKS,
        positions,
        totalValue,
        endpoints: {
          rpcProxy: "/api/rpc",
          tokensByWallet:
            "POST https://api.g.alchemy.com/data/v1/:apiKey/assets/tokens/by-address",
        },
        computedAt: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
