import { useState, useEffect, useRef, useCallback } from "react";

type QueryStatus = "idle" | "loading" | "success" | "error";

interface QueryCacheEntry<T> {
  data: T;
  timestamp: number;
  staleTime: number;
  error: null;
}

interface QueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retry?: number;
  retryDelay?: number;
  initialData?: T;
}

interface QueryResult<T> {
  data: T | undefined;
  error: Error | null;
  status: QueryStatus;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  isStale: boolean;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

interface MutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  invalidateKeys?: string[][];
  retry?: number;
}

interface MutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

const queryCache = new Map<string, QueryCacheEntry<unknown>>();
const activeQueries = new Map<string, Promise<unknown>>();
const subscribers = new Map<string, Set<() => void>>();
const GLOBAL_STALE_TIME = 30_000;
const GLOBAL_CACHE_TIME = 300_000;
const GC_INTERVAL = 60_000;

function serializeKey(key: string[]): string {
  return JSON.stringify(key);
}

function notifySubscribers(key: string): void {
  const subs = subscribers.get(key);
  if (subs) {
    subs.forEach(cb => {
      try { cb(); } catch {}
    });
  }
}

function addSubscriber(key: string, cb: () => void): () => void {
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key)!.add(cb);
  return () => {
    subscribers.get(key)?.delete(cb);
    if (subscribers.get(key)?.size === 0) subscribers.delete(key);
  };
}

export function invalidateQueries(keyPattern: string[]): void {
  Array.from(queryCache.keys()).forEach(serializedKey => {
    try {
      const cachedKey: string[] = JSON.parse(serializedKey);
      const matches = keyPattern.every((part, i) => cachedKey[i] === part);
      if (matches) {
        queryCache.delete(serializedKey);
        notifySubscribers(serializedKey);
      }
    } catch {
      queryCache.delete(serializedKey);
      notifySubscribers(serializedKey);
    }
  });
}

export function setQueryData<T>(key: string[], data: T, staleTime?: number): void {
  const serialized = serializeKey(key);
  queryCache.set(serialized, {
    data,
    timestamp: Date.now(),
    staleTime: staleTime || GLOBAL_STALE_TIME,
    error: null,
  });
  notifySubscribers(serialized);
}

export function getQueryData<T>(key: string[]): T | undefined {
  const entry = queryCache.get(serializeKey(key));
  return entry?.data as T | undefined;
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  delay: number
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
    }
  }
  throw new Error("Unreachable");
}

async function deduplicatedFetch<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = activeQueries.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn().finally(() => {
    activeQueries.delete(key);
  });

  activeQueries.set(key, promise);
  return promise;
}

export function useSovereignQuery<T>(options: QueryOptions<T>): QueryResult<T> {
  const {
    queryKey,
    queryFn,
    staleTime = GLOBAL_STALE_TIME,
    refetchInterval = false,
    refetchOnWindowFocus = true,
    enabled = true,
    onSuccess,
    onError,
    retry = 3,
    retryDelay = 1000,
    initialData,
  } = options;

  const serializedKey = serializeKey(queryKey);
  const [, forceUpdate] = useState(0);
  const rerender = useCallback(() => forceUpdate(c => c + 1), []);

  const statusRef = useRef<QueryStatus>("idle");
  const errorRef = useRef<Error | null>(null);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const cached = queryCache.get(serializedKey);
  const isStale = cached ? (Date.now() - cached.timestamp > staleTime) : true;

  const data: any = cached?.data ?? initialData;

  const doFetch = useCallback(async () => {
    if (!mountedRef.current) return;
    fetchingRef.current = true;
    if (!cached) statusRef.current = "loading";
    rerender();

    try {
      const result = await deduplicatedFetch(serializedKey, () =>
        fetchWithRetry(queryFn, retry, retryDelay)
      );

      queryCache.set(serializedKey, {
        data: result,
        timestamp: Date.now(),
        staleTime,
        error: null,
      });

      statusRef.current = "success";
      errorRef.current = null;
      fetchingRef.current = false;

      if (mountedRef.current) {
        rerender();
        onSuccess?.(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      statusRef.current = "error";
      errorRef.current = error;
      fetchingRef.current = false;

      if (mountedRef.current) {
        rerender();
        onError?.(error);
      }
    }
  }, [serializedKey, queryFn, staleTime, retry, retryDelay]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    if (!cached || isStale) {
      doFetch();
    } else {
      statusRef.current = "success";
    }

    const unsub = addSubscriber(serializedKey, () => {
      if (mountedRef.current) doFetch();
    });

    return unsub;
  }, [serializedKey, enabled]);

  useEffect(() => {
    if (!refetchInterval || !enabled) return;
    const id = setInterval(doFetch, refetchInterval);
    return () => clearInterval(id);
  }, [refetchInterval, enabled, doFetch]);

  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;
    const handler = () => {
      if (isStale) doFetch();
    };
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [refetchOnWindowFocus, enabled, doFetch]);

  return {
    data,
    error: errorRef.current,
    status: statusRef.current,
    isLoading: statusRef.current === "loading",
    isFetching: fetchingRef.current,
    isSuccess: statusRef.current === "success",
    isError: statusRef.current === "error",
    isStale,
    refetch: doFetch,
    invalidate: () => invalidateQueries(queryKey),
  };
}

export function useSovereignMutation<TData = unknown, TVariables = unknown>(
  options: MutationOptions<TData, TVariables>
): MutationResult<TData, TVariables> {
  const { mutationFn, onSuccess, onError, onSettled, invalidateKeys, retry = 0 } = options;

  const [state, setState] = useState<{
    data: TData | undefined;
    error: Error | null;
    status: "idle" | "loading" | "success" | "error";
  }>({ data: undefined, error: null, status: "idle" });

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    setState({ data: undefined, error: null, status: "loading" });

    try {
      const result = await fetchWithRetry(() => mutationFn(variables), retry, 1000);

      setState({ data: result, error: null, status: "success" });
      onSuccess?.(result, variables);
      onSettled?.(result, null, variables);

      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          invalidateQueries(key);
        }
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ data: undefined, error, status: "error" });
      onError?.(error, variables);
      onSettled?.(undefined, error, variables);
      throw error;
    }
  }, [mutationFn, retry, onSuccess, onError, onSettled, invalidateKeys]);

  const mutate = useCallback((variables: TVariables) => {
    mutateAsync(variables).catch(() => {});
  }, [mutateAsync]);

  const reset = useCallback(() => {
    setState({ data: undefined, error: null, status: "idle" });
  }, []);

  return {
    mutate,
    mutateAsync,
    data: state.data,
    error: state.error,
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    reset,
  };
}

setInterval(() => {
  const now = Date.now();
  Array.from(queryCache.entries()).forEach(([key, entry]) => {
    if (now - entry.timestamp > GLOBAL_CACHE_TIME && !subscribers.has(key)) {
      queryCache.delete(key);
    }
  });
}, GC_INTERVAL);
