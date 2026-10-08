"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

// Share one in-flight login, including Strict Mode; recheck later sessions.
let pendingLogin: Promise<string> | null = null;
function ensureUser(): Promise<string> {
  if (pendingLogin) return pendingLogin;
  pendingLogin = (async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session?.user) return data.session.user.id;
    const result = await supabase.auth.signInAnonymously();
    if (result.error) throw result.error;
    if (!result.data.user) throw new Error("사용자 정보를 받지 못했습니다.");
    return result.data.user.id;
  })().finally(() => { pendingLogin = null; });
  return pendingLogin;
}

export function useAnonymousAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    ensureUser().then((id) => {
      if (!cancelled) setUserId(id);
    }).catch(() => {
      if (!cancelled) setErrorMessage("연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.");
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [attempt]);

  function retry() {
    setErrorMessage(null);
    setIsLoading(true);
    setAttempt((value) => value + 1);
  }
  return { userId, isLoading, errorMessage, retry };
}
