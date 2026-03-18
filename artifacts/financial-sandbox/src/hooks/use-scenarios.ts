import { useState, useCallback } from "react";
import axios from "axios";
import type { FinancialProfile } from "@workspace/api-client-react";

const BASE = `${import.meta.env.BASE_URL}api`;

export interface ScenarioMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioFull extends ScenarioMeta {
  data: FinancialProfile;
}

export interface SaveScenarioResult {
  id: string | null;
  overwritten: boolean;
  conflictId?: string;
}

export function useScenarios() {
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScenarios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.get<ScenarioMeta[]>(`${BASE}/scenarios`);
      setScenarios(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load saved configs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveScenario = useCallback(async (
    name: string,
    description: string,
    profile: FinancialProfile,
    options?: { existingId?: string; overwriteExisting?: boolean }
  ): Promise<SaveScenarioResult> => {
    try {
      const body = {
        name,
        description,
        data: profile,
        overwriteExisting: options?.overwriteExisting ?? false,
      };
      if (options?.existingId) {
        await axios.put(`${BASE}/scenarios/${options.existingId}`, body);
        return { id: options.existingId, overwritten: true };
      } else {
        const res = await axios.post<{ id: string; overwritten?: boolean }>(`${BASE}/scenarios`, body);
        return { id: res.data.id, overwritten: res.data.overwritten ?? false };
      }
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 409) {
        const detail = e.response.data?.detail;
        return {
          id: null,
          overwritten: false,
          conflictId: detail?.existingId,
        };
      }
      return { id: null, overwritten: false };
    }
  }, []);

  const loadScenario = useCallback(async (id: string): Promise<FinancialProfile | null> => {
    try {
      const res = await axios.get<ScenarioFull>(`${BASE}/scenarios/${id}`);
      return res.data.data;
    } catch {
      return null;
    }
  }, []);

  const deleteScenario = useCallback(async (id: string): Promise<void> => {
    await axios.delete(`${BASE}/scenarios/${id}`);
  }, []);

  return {
    scenarios,
    isLoading,
    error,
    fetchScenarios,
    saveScenario,
    loadScenario,
    deleteScenario,
  };
}
