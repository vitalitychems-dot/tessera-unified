import { useCallback, useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadMyCredit } from "@/lib/store-api";

export function useLabCredit() {
  const { user, isPending } = useCurrentUserState();
  const [balance, setBalance] = useState(0);
  const [ready, setReady] = useState(false);
  const userId = user?.id;

  const refresh = useCallback(() => {
    if (isPending) return;
    if (!userId) {
      setBalance(0);
      setReady(true);
      return;
    }
    loadMyCredit()
      .then((r) => setBalance(r.balance))
      .catch(() => setBalance(0))
      .finally(() => setReady(true));
  }, [userId, isPending]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    balance,
    signedIn: Boolean(user),
    user,
    isPending: isPending || Boolean(user && !ready),
    refresh,
  };
}
