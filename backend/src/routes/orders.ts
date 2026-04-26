import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { getUserOrderIds, getOrderSummary, getOrderFills } from "../lib/executor";

const router = Router();

// 모든 주문 라우트는 JWT 필요
router.use(requireAuth);

/**
 * GET /api/orders
 * 로그인한 사용자의 전체 주문 목록 + 각 요약
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { address } = req.user!;
  try {
    const ids = await getUserOrderIds(address);
    if (ids.length === 0) {
      res.json({ orders: [], total: 0 });
      return;
    }
    const orders = await Promise.all(ids.map(id => getOrderSummary(id)));
    // 최신 순 정렬
    orders.reverse();
    res.json({ orders, total: orders.length });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "서버 오류" });
  }
});

/**
 * GET /api/orders/:id
 * 특정 주문 상세 + 체결 내역
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const { address } = req.user!;
  const { id } = req.params;

  try {
    const [summary, fills] = await Promise.all([
      getOrderSummary(id),
      getOrderFills(id),
    ]);

    // 다른 사용자 주문은 열람 금지
    if (summary.user.toLowerCase() !== address.toLowerCase()) {
      res.status(403).json({ error: "접근 권한이 없습니다." });
      return;
    }

    res.json({ order: summary, fills });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "서버 오류" });
  }
});

export default router;
