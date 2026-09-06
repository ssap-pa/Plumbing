"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui";

export function SeedButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="secondary" onClick={run} disabled={busy}>{busy ? "추가 중…" : "샘플 현장 3건 넣어 보기"}</Button>
  );
}
