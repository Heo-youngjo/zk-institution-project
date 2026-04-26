"use client";

import { useState, useEffect, useCallback } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
const JWT_KEY = "zk_jwt";

export interface BackendSession {
  token: string;
  address: string;
  expiresAt: number;
}

export function useBackendAuth() {
  const [session, setSession] = useState<BackendSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 페이지 로드 시 localStorage에서 JWT 복원
  useEffect(() => {
    const raw = localStorage.getItem(JWT_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as BackendSession;
      // 만료된 토큰은 버림
      if (saved.expiresAt > Math.floor(Date.now() / 1000)) {
        setSession(saved);
      } else {
        localStorage.removeItem(JWT_KEY);
      }
    } catch {
      localStorage.removeItem(JWT_KEY);
    }
  }, []);

  // 온체인 ZK 세션 활성화 후 호출 — JWT 발급 요청
  const loginToBackend = useCallback(async (address: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "백엔드 로그인 실패");
      }

      const newSession: BackendSession = {
        token:     data.token,
        address:   data.address,
        expiresAt: data.expiresAt,
      };
      setSession(newSession);
      localStorage.setItem(JWT_KEY, JSON.stringify(newSession));
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 로그아웃 — JWT 삭제
  const logout = useCallback(() => {
    localStorage.removeItem(JWT_KEY);
    setSession(null);
    setError(null);
  }, []);

  // 인증된 fetch 헬퍼 — Authorization 헤더 자동 첨부
  const authFetch = useCallback(
    (url: string, options: RequestInit = {}) => {
      if (!session?.token) throw new Error("로그인이 필요합니다.");
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${session.token}`,
        },
      });
    },
    [session],
  );

  const remaining = session
    ? Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000))
    : 0;

  return {
    session,
    isAuthed:  !!session,
    isLoading,
    error,
    remaining,
    loginToBackend,
    logout,
    authFetch,
  };
}
