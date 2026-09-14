export type Position = {
  network: string;
  contractAddress: string | null;
  symbol: string;
  name: string | null;
  logo: string | null;
  decimals: number;
  balance: string;
  priceUsd: number | null;
  valueUsd: number | null;
};

export type Portfolio = {
  address: string;
  positions: Position[];
  totalValue: number;
};
