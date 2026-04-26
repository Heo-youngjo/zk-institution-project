const BASE_URL = "https://api.dexscreener.com/latest/dex";

export async function getPairData(chainId: string, pairAddress: string) {
  try {
    const res = await fetch(`${BASE_URL}/pairs/${chainId}/${pairAddress}`);
    return await res.json();
  } catch (error) {
    console.error("DexScreener API error:", error);
    return null;
  }
}
