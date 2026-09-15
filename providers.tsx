"use client";
import { PrivyProvider } from "@privy-io/react-auth";
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
      config={{ loginMethods: ["email"], embeddedWallets: { solana: { createOnLogin: "users-without-wallets" } } }}
    >
      {children}
    </PrivyProvider>
  );
}
