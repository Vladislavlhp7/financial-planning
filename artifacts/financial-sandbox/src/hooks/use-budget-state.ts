import { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash-es";
import { useGetBudget, useUpdateBudget, useResetBudget } from "@workspace/api-client-react";
import type { FinancialProfile } from "@workspace/api-client-react";

export const DEFAULT_PROFILE: FinancialProfile = {
  income: [{ id: "1", name: "Base Salary", amount: 6000, frequency: "monthly" }],
  expenses: [
    { id: "e1", name: "Rent/Mortgage", amount: 2000, frequency: "monthly" },
    { id: "e2", name: "Living Expenses", amount: 1500, frequency: "monthly" },
  ],
  assets: [{ id: "a1", name: "Savings Account", amount: 25000, returnRate: 0.04 }],
  investments: [
    { id: "i1", name: "Monthly Contributions", amount: 1000, frequency: "monthly", returnRate: 0.08 },
  ],
  investmentBuckets: [
    { id: "bkt-1", name: "Long-term ETFs", currentAllocationPct: 60, targetAllocationPct: 65, returnRate: 0.08 },
    { id: "bkt-2", name: "Mid-term Equity", currentAllocationPct: 30, targetAllocationPct: 25, returnRate: 0.10 },
    { id: "bkt-3", name: "Risky / Alts", currentAllocationPct: 10, targetAllocationPct: 10, returnRate: 0.15 },
  ],
  activeTrading: {
    enabled: true,
    amount: 200,
    frequency: "monthly",
    currentReturnRate: 0.12,
    targetReturnRate: 0.20,
    riskLevel: 7,
  },
  scenarioSettings: {
    expenseModifier: 1,
    incomeModifier: 1,
    investmentReturnOverride: -1,
    inflationRate: 0.02,
    compoundingFrequency: "monthly",
    timeframeYears: 10,
    useTargetAllocations: false,
    goals: [],
  },
};

export function useBudgetState() {
  const [profile, setProfile] = useState<FinancialProfile>(DEFAULT_PROFILE);
  const [isReady, setIsReady] = useState(false);

  const { data: serverProfile, isLoading, isError } = useGetBudget({
    query: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  });

  const updateMutation = useUpdateBudget();
  const resetMutation = useResetBudget();

  useEffect(() => {
    if (serverProfile && !isReady) {
      setProfile(serverProfile);
      setIsReady(true);
    } else if (isError && !isReady) {
      setProfile(DEFAULT_PROFILE);
      setIsReady(true);
    }
  }, [serverProfile, isError, isReady]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce((newProfile: FinancialProfile) => {
      updateMutation.mutate({ data: newProfile });
    }, 1000),
    []
  );

  const updateProfile = useCallback(
    (updater: (prev: FinancialProfile) => FinancialProfile) => {
      setProfile((prev) => {
        const next = updater(prev);
        debouncedSave(next);
        return next;
      });
    },
    [debouncedSave]
  );

  const resetProfile = useCallback(async () => {
    try {
      const result = await resetMutation.mutateAsync();
      setProfile(result || DEFAULT_PROFILE);
    } catch {
      setProfile(DEFAULT_PROFILE);
      debouncedSave(DEFAULT_PROFILE);
    }
  }, [resetMutation, debouncedSave]);

  return {
    profile,
    updateProfile,
    resetProfile,
    isLoading: !isReady && isLoading,
    isSaving: updateMutation.isPending,
  };
}
