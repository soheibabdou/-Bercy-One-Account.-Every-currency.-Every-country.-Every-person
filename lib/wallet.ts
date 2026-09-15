import type { User } from "@privy-io/react-auth";

export function getWalletAddress(user: User | null): string | null {
  if (!user) return null;

  // Check user.wallet first (primary wallet)
  if (user.wallet?.address) return user.wallet.address;

  // Check linkedAccounts for any wallet
  const wallet = user.linkedAccounts?.find(
    (account: any) => account.type === "wallet"
  );
  if (wallet && "address" in wallet) return (wallet as any).address;

  return null;
}
