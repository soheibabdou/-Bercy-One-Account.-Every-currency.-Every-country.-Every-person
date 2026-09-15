"use client";
import { usePrivy } from "@privy-io/react-auth";

export default function AuthButton() {
  const { login, logout, authenticated, user, ready } = usePrivy();

  if (!ready) {
    return (
      <button disabled className="px-4 py-2 rounded-xl bg-[#B8860B] text-black opacity-50">
        Loading...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="px-6 py-3 rounded-xl bg-[#B8860B] text-black font-semibold hover:opacity-90 transition"
      >
        Sign in with email
      </button>
    );
  }

  const address = user?.wallet?.address ?? "";
  const truncated = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : "Connected";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400">{truncated}</span>
      <button
        onClick={logout}
        className="px-4 py-2 rounded-xl border border-gray-600 text-gray-300 text-sm hover:border-gray-400 transition"
      >
        Sign out
      </button>
    </div>
  );
}