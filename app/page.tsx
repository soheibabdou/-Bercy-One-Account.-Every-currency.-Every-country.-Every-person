"use client";

import { useMemo, useState } from "react";
import type { Portfolio } from "@/lib/portfolio";

function usd(n: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function chainLabel(network: string) {
  if (network === "eth-mainnet") return "Ethereum";
  if (network === "base-mainnet") return "Base";
  if (network === "solana-mainnet") return "Solana";
  return network;
}

function formatBalance(balance: string) {
  const n = Number(balance);
  if (!Number.isFinite(n)) return balance;
  if (n > 0 && n < 0.000001) return n.toExponential(3);
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export default function Page() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Portfolio | null>(null);

  const total = data?.totalValue ?? 0;

  async function load() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const r = await fetch("/api/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const json = await r.json();
      if (!r.ok) {
        throw new Error(json.error ?? json.detail ?? "Could not load portfolio");
      }
      setData(json as Portfolio);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const pricedCount = useMemo(
    () => data?.positions.filter((p) => p.valueUsd != null).length ?? 0,
    [data],
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium tracking-[0.2em] text-accent">
              🏛️ BERCY
            </p>
            <h1 className="mt-2 max-w-xl text-4xl font-semibold tracking-tight">
              One account. Every chain. Zero fees.
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted">
              Load any Ethereum, Base, or Solana wallet. Balances stay exact
              with BigInt math. Alchemy keys never leave the server.
            </p>
          </div>
        </header>

        <form
          className="mt-10 grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (address.trim()) void load();
          }}
        >
          <div>
            <label htmlFor="wallet" className="text-xs font-medium text-muted">
              Wallet address
            </label>
            <input
              id="wallet"
              name="wallet"
              autoComplete="off"
              spellCheck={false}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x… or Solana address"
              className="mt-1 h-11 w-full rounded-xl border border-line bg-card px-3 font-mono text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !address.trim()}
            className="h-11 min-w-[10rem] rounded-xl bg-accent px-5 text-sm font-semibold text-accent-fg transition-opacity disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {loading ? "Loading…" : "Load Portfolio"}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2 h-10 text-sm font-medium underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-accent"
            >
              Try again
            </button>
          </div>
        )}

        {loading && (
          <section className="mt-8 grid gap-4" aria-busy="true" aria-live="polite">
            <div className="h-28 animate-pulse rounded-2xl bg-card" />
            <div className="h-64 animate-pulse rounded-2xl bg-card" />
            <span className="sr-only">Loading portfolio</span>
          </section>
        )}

        {data && (
          <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-card p-5">
              <div className="text-xs uppercase tracking-wide text-muted">
                Total portfolio value
              </div>
              <div className="mt-2 font-mono text-3xl font-semibold">
                {usd(total)}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-card p-5">
              <div className="text-xs uppercase tracking-wide text-muted">
                Positions
              </div>
              <div className="mt-2 font-mono text-3xl font-semibold">
                {data.positions.length}
              </div>
              <p className="mt-1 text-xs text-muted">
                {pricedCount} with USD prices
              </p>
            </div>
          </section>
        )}

        {data?.positions.length ? (
          <section className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card">
            <table className="min-w-full text-sm">
              <caption className="sr-only">Token balances</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Chain</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                  <th className="px-4 py-3 text-right font-medium">USD value</th>
                  <th className="px-4 py-3 text-right font-medium">Weight %</th>
                </tr>
              </thead>
              <tbody>
                {data.positions.map((p, idx) => {
                  const value = p.valueUsd ?? 0;
                  const weight = total ? (100 * value) / total : 0;
                  return (
                    <tr key={`${p.network}-${p.contractAddress}-${idx}`} className="border-t border-line">
                      <td className="px-4 py-3 font-medium">{p.symbol}</td>
                      <td className="px-4 py-3 text-muted">{chainLabel(p.network)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatBalance(p.balance)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {p.valueUsd != null ? usd(p.valueUsd) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {p.valueUsd != null ? `${weight.toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ) : null}

        {data && data.positions.length === 0 && (
          <section className="mt-6 rounded-2xl border border-dashed border-line p-6 text-sm text-muted">
            No token balances found for this address on Ethereum, Base, or Solana.
          </section>
        )}

        {!data && !loading && !error && (
          <section className="mt-10 rounded-2xl border border-dashed border-line p-6 text-sm text-muted">
            Enter a wallet address and load the portfolio to see balances, USD
            value, and weight across chains.
          </section>
        )}

        <footer className="mt-auto pt-12 text-center text-xs text-muted">
          Built on Solana · Powered by Alchemy
        </footer>
      </div>
    </div>
  );
}
