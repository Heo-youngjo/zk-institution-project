import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { getUserOrderIds, getOrderSummary, getOrderFills } from "../lib/executor";

const router = Router();
router.use(requireAuth);

/**
 * GET /api/portfolio
 * 사용자 포트폴리오 요약:
 * - 총 주문 수 / 체결 수 / 진행 중
 * - 총 투입 USDT / 총 받은 ETH
 * - 최근 체결 5건
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { address } = req.user!;

  try {
    const ids = await getUserOrderIds(address);

    if (ids.length === 0) {
      res.json({
        totalOrders:  0,
        filledOrders: 0,
        activeOrders: 0,
        totalIn:      "0.000000",
        totalOut:     "0.000000",
        recentFills:  [],
      });
      return;
    }

    const orders = await Promise.all(ids.map(id => getOrderSummary(id)));

    const filledOrders = orders.filter(o => o.status === "Filled").length;
    const activeOrders = orders.filter(o => o.status === "Active" || o.status === "Pending").length;

    let totalIn  = 0;
    let totalOut = 0;
    const allFills: Array<{ orderId: string; chunkIndex: number; dexPool: string; amountIn: string; amountOut: string; executedAt: number }> = [];

    for (const order of orders) {
      totalIn  += parseFloat(order.totalAmount);
      totalOut += parseFloat(order.totalOut);

      if (parseFloat(order.totalOut) > 0) {
        const fills = await getOrderFills(order.orderId);
        allFills.push(...fills);
      }
    }

    // 최신 체결 5건
    allFills.sort((a, b) => b.executedAt - a.executedAt);
    const recentFills = allFills.slice(0, 5);

    res.json({
      totalOrders:  orders.length,
      filledOrders,
      activeOrders,
      totalIn:      totalIn.toFixed(6),
      totalOut:     totalOut.toFixed(6),
      recentFills,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "서버 오류" });
  }
});

export default router;
