import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Throws if error, returns data otherwise
export function guard<T>(res: { data: T | null; error: any }): T {
  if (res.error) throw res.error;
  if (res.data === null || res.data === undefined) throw new Error("No data returned");
  return res.data;
}

// useAsync hook: runs async fn, tracks loading/data/error, supports reload
export function useAsync<T>(fn: () => Promise<T>, deps: any[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fnRef = useRef(fn);

  // Always use latest fn
  useEffect(() => { fnRef.current = fn; }, [fn]);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  // Run on mount/deps change
  useEffect(() => { execute(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, error, loading, reload: execute };
}

export { supabase };
