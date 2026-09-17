"use client";

import {
  useEffect,
  useState,
} from "react";

import { createClient } from "../lib/supabase/client";

export function useAnonymousAuth() {
  const [userId, setUserId] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
  const supabase = createClient();

  async function ensureAnonymousUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      setUserId(session.user.id);
      setIsLoading(false);
      return;
    }

    const {
  data,
  error,
} = await supabase.auth.signInAnonymously();

if (error) {
  setErrorMessage(error.message);
  setIsLoading(false);
  return;
}

if (!data.user) {
  setErrorMessage(
    "익명 사용자 정보를 받지 못했습니다."
  );
  setIsLoading(false);
  return;
}

setUserId(data.user.id);
setIsLoading(false);
  }

  ensureAnonymousUser();
}, []);

  return {
    userId,
    isLoading,
    errorMessage,
  };
}