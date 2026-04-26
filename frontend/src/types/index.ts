export interface UserSession {
  id: string;
  expiresAt: number;
  isAuthenticated: boolean;
}

export interface MarketData {
  price: number;
  change24h: number;
  volume24h: number;
}
