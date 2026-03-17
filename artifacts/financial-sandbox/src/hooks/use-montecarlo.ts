import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import type { FinancialProfile } from "@workspace/api-client-react";

const BASE = `${import.meta.env.BASE_URL}api`;

export interface PercentileBand {
  year: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export function useMonteCarlo(profile: FinancialProfile, enabled: boolean, runs = 1000) {
  const [bands, setBands] = useState<PercentileBand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBands = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.post<{ bands: PercentileBand[] }>(
        `${BASE}/simulate/montecarlo`,
        { profile, runs }
      );
      setBands(res.data.bands);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
      setBands([]);
    } finally {
      setIsLoading(false);
    }
  }, [profile, runs, enabled]);

  useEffect(() => {
    if (!enabled) {
      setBands([]);
      setIsLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchBands();
      debounceRef.current = null;
    }, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [profile, enabled, fetchBands]);

  return { bands, isLoading, error };
}
