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
    existingId?: string
  ): Promise<string | null> => {
    try {
      const body = { name, description, data: profile };
      if (existingId) {
        await axios.put(`${BASE}/scenarios/${existingId}`, body);
        return existingId;
      } else {
        const res = await axios.post<{ id: string }>(`${BASE}/scenarios`, body);
        return res.data.id;
      }
    } catch {
      return null;
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
