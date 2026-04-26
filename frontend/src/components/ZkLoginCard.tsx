"use client";

import { useRef, useState } from "react";
import { useZkLogin } from "@/hooks/useZkLogin";
import { useSession } from "@/hooks/useSession";
import { useWallet } from "@/hooks/useWallet";
import type { ProofInput } from "@/lib/proof";

const STEP_LABEL: Record<string, string> = {
  idle:      "Authenticate with ZK-ID",
  generating:"Generating proof…",
  submitting:"Submitting transaction…",
  success:   "Authenticated",
  error:     "Retry",
};

export default function ZkLoginCard() {
  const { isConnected } = useWallet();
  const { isActive, session, refetchStatus } = useSession();
  const { login, status, error, isLoading } = useZkLogin();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const handleLogin = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setParseError("input JSON 파일을 선택하세요."); return; }
    let input: ProofInput;
    try { input = JSON.parse(await file.text()) as ProofInput; }
    catch { setParseError("올바른 JSON 파일이 아닙니다."); return; }
    await login(input);
    refetchStatus();
  };

  /* ── 세션 활성 상태 ── */
  if (isActive && session) {
    const remaining = Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000));
    const hh = String(Math.floor(remaining / 3600)).padStart(2, "0");
    const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");

    return (
      <div className="p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--tv-text-muted)" }}>
          Authentication
        </p>
        <div
          className="rounded p-3 flex items-center gap-3"
          style={{ background: "rgba(8,153,129,0.1)", border: "1px solid rgba(8,153,129,0.3)" }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--tv-green)" }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--tv-green)" }}>Session Active</p>
            <p className="text-xs font-mono" style={{ color: "var(--tv-text-muted)" }}>
              Expires in {hh}:{mm}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── 로그인 폼 ── */
  return (
    <div className="p-4 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--tv-text-muted)" }}>
        Authentication
      </p>

      {!isConnected && (
        <p className="text-xs" style={{ color: "var(--tv-red)" }}>
          Connect wallet first
        </p>
      )}

      {/* 파일 업로드 */}
      <div
        className="rounded p-3 text-center cursor-pointer transition-colors"
        style={{
          border: "1px dashed var(--tv-border)",
          background: "var(--tv-bg-tertiary)",
        }}
        onClick={() => fileRef.current?.click()}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--tv-blue)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--tv-border)"; }}
      >
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
        <p className="text-xs" style={{ color: fileName ? "var(--tv-text-primary)" : "var(--tv-text-muted)" }}>
          {fileName ?? "input_X.json"}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--tv-text-muted)" }}>
          Click to upload credential file
        </p>
      </div>

      {/* 프로그레스 바 */}
      {isLoading && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {["generating", "submitting"].map((s, i) => (
              <div
                key={s}
                className="flex-1 h-0.5 rounded transition-colors"
                style={{
                  background: ["generating", "submitting"].indexOf(status) >= i
                    ? "var(--tv-blue)"
                    : "var(--tv-border)",
                }}
              />
            ))}
          </div>
          <p className="text-xs" style={{ color: "var(--tv-text-muted)" }}>
            {STEP_LABEL[status]}
          </p>
        </div>
      )}

      {/* 에러 */}
      {(parseError ?? error) && (
        <p className="text-xs" style={{ color: "var(--tv-red)" }}>{parseError ?? error}</p>
      )}

      {/* 버튼 */}
      <button
        onClick={handleLogin}
        disabled={isLoading || !isConnected}
        className="w-full py-2 text-xs font-semibold rounded tv-btn-primary"
      >
        {STEP_LABEL[status] ?? "Authenticate with ZK-ID"}
      </button>

      <p className="text-xs text-center" style={{ color: "var(--tv-text-muted)" }}>
        Zero-Knowledge · Privacy Preserving · 1hr Session
      </p>
    </div>
  );
}
