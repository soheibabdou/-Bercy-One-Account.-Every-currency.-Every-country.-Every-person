import { NextRequest, NextResponse } from "next/server";

const NETWORKS: Record<string, string | undefined> = {
  "eth-mainnet": process.env.ALCHEMY_API_URL_ETH_MAINNET,
  "base-mainnet": process.env.ALCHEMY_API_URL_BASE_MAINNET,
  "solana-mainnet": process.env.ALCHEMY_API_URL_SOLANA_MAINNET,
};

function upstreamFor(chain: string): string | null {
  const fromEnv = NETWORKS[chain];
  if (fromEnv && !fromEnv.includes("<KEY>")) return fromEnv;

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return null;
  if (!(chain in NETWORKS)) return null;
  return `https://${chain}.g.alchemy.com/v2/${apiKey}`;
}

export async function POST(request: NextRequest) {
  const chain = request.headers.get("x-chain") || "eth-mainnet";
  const upstream = upstreamFor(chain);

  if (!upstream) {
    return NextResponse.json(
      {
        error: `Missing Alchemy RPC upstream for "${chain}". Set ALCHEMY_API_KEY in .env.local.`,
      },
      { status: 500 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const res = await fetch(upstream, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return NextResponse.json(
      { error: "Upstream returned non-JSON", status: res.status },
      { status: 502 },
    );
  }

  return NextResponse.json(json, {
    status: res.ok ? 200 : res.status || 502,
    headers: { "cache-control": "no-store" },
  });
}
