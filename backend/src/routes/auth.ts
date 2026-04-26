import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getSessionInfo } from "../lib/registry";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

/**
 * POST /api/auth/login
 * body: { address: string }
 *
 * 온체인 Registry.isLoggedIn() 확인 후 JWT 발급
 */
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { address } = req.body as { address?: string };

  if (!address) {
    res.status(400).json({ error: "address 필드가 필요합니다." });
    return;
  }

  try {
    const session = await getSessionInfo(address);

    if (!session.isLoggedIn) {
      res.status(403).json({
        error: "ZK 세션이 없습니다. 프론트엔드에서 ZK 증명 로그인을 먼저 완료하세요.",
        hint:  "Registry.verifyLogin()을 호출해 온체인 세션을 활성화하세요.",
      });
      return;
    }

    // JWT 만료를 온체인 세션 만료와 동기화
    const now       = Math.floor(Date.now() / 1000);
    const remaining = session.expiresAt - now;

    if (remaining <= 0) {
      res.status(403).json({ error: "ZK 세션이 만료되었습니다." });
      return;
    }

    const token = jwt.sign(
      { address: session.address, expiresAt: session.expiresAt },
      process.env.JWT_SECRET!,
      { expiresIn: remaining },
    );

    res.json({
      token,
      address:   session.address,
      expiresAt: session.expiresAt,
      expiresIn: remaining,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "서버 오류";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/auth/me
 * header: Authorization: Bearer <token>
 *
 * 현재 JWT 세션 정보 조회
 */
router.get("/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { address, expiresAt } = req.user!;

  try {
    // 온체인 상태도 한 번 더 확인
    const session = await getSessionInfo(address);

    const now = Math.floor(Date.now() / 1000);
    res.json({
      address,
      expiresAt,
      remaining:       Math.max(0, expiresAt - now),
      onChainActive:   session.isLoggedIn,
      onChainExpires:  session.expiresAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "서버 오류";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/auth/logout
 * (JWT는 stateless라 서버에서 실제 무효화는 없음 — 클라이언트가 토큰 삭제)
 */
router.post("/logout", requireAuth, (_req: Request, res: Response): void => {
  res.json({ message: "로그아웃 완료. 클라이언트에서 토큰을 삭제하세요." });
});

export default router;
