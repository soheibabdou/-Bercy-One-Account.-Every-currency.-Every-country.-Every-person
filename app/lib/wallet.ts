import type { User } from "@privy-io/react-auth";

export function getWalletAddress(user: User | null): string | null {
  if (!user) return null;
  
  const solanaWallet = user.linkedAccounts?.find(
    (account: any) => account.type === "wallet" && account.chainType === "solana"
  );
  if (solanaWallet && "address" in solanaWallet) {
    return (solanaWallet as any).address;
  }

  const anyWallet = user.linkedAccounts?.find(
    (account: any) => account.type === "wallet"
  );
  if (anyWallet && "address" in anyWallet) {
    return (anyWallet as any).address;
  }

  return null;
}