const BASE_URL = "https://api.coingecko.com/api/v3";

export async function getTokenPrice(id: string) {
  try {
    const res = await fetch(`${BASE_URL}/simple/price?ids=${id}&vs_currencies=usd`);
    return await res.json();
  } catch (error) {
    console.error("Gecko API error:", error);
    return null;
  }
}
