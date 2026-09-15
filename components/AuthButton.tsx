"use client";
import { usePrivy, useWallets } from "@privy-io/react-auth";
export default function AuthButton() {
  const { login, logout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  if (!ready) return <button disabled className="px-4 py-2 rounded-xl bg-accent text-accent-fg opacity-50">Loading...</button>;
  if (!authenticated) return <button onClick={login} className="px-6 py-3 rounded-xl bg-accent text-accent-fg font-semibold hover:opacity-90 transition">Sign in with email</button>;
  const solanaWallet = wallets.find((w) => w.chainType === "solana");
  const primaryWallet = solanaWallet ?? wallets[0];
  const address = primaryWallet?.address ?? "";
  const truncated = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "Connected";
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted">{truncated}</span>
      <button onClick={logout} className="px-4 py-2 rounded-xl border border-line text-muted text-sm hover:border-accent transition">Sign out</button>
    </div>
  );
}
