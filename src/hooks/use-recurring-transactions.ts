"use client";

import { useCallback, useEffect, useState } from "react";
import type { Transaction } from "@/types/financeiro";

export interface RecurringParent extends Transaction {
  instancesInMonth: number;
  expectedCount: number;
  generated: boolean;
}

interface UseRecurringTransactionsReturn {
  parents: RecurringParent[];
  loading: boolean;
  error: string | null;
  generateForMonth: (
    transactionId: string,
    month: number,
    year: number
  ) => Promise<{ success: boolean; totalCreated: number; error?: string }>;
  refresh: () => void;
}

export function useRecurringTransactions(
  month: number,
  year: number
): UseRecurringTransactionsReturn {
  const [parents, setParents] = useState<RecurringParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchParents() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/financeiro/recorrentes?month=${month}&year=${year}`
        );
        const json = await res.json();

        if (cancelled) {
          return;
        }

        if (!res.ok) {
          setError(json.error ?? "Erro ao buscar recorrentes");
          return;
        }

        setParents(json.data ?? []);
      } catch {
        if (!cancelled) {
          setError("Erro ao buscar transacoes recorrentes");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchParents();

    return () => {
      cancelled = true;
    };
  }, [month, year, refreshTrigger]);

  const generateForMonth = useCallback(
    async (
      transactionId: string,
      targetMonth: number,
      targetYear: number
    ): Promise<{ success: boolean; totalCreated: number; error?: string }> => {
      try {
        const res = await fetch("/api/financeiro/recorrentes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId, targetMonth, targetYear }),
        });

        const json = await res.json();

        if (!res.ok) {
          return {
            success: false,
            totalCreated: 0,
            error: json.error ?? "Erro ao gerar recorrentes",
          };
        }

        const totalCreated: number = json.data?.totalCreated ?? 0;

        setParents((prev) =>
          prev.map((parent) => {
            if (parent.id !== transactionId) {
              return parent;
            }

            const instancesInMonth = parent.instancesInMonth + totalCreated;
            return {
              ...parent,
              instancesInMonth,
              generated:
                instancesInMonth >= parent.expectedCount &&
                parent.expectedCount > 0,
            };
          })
        );

        return { success: true, totalCreated };
      } catch {
        return {
          success: false,
          totalCreated: 0,
          error: "Erro ao gerar transacoes recorrentes",
        };
      }
    },
    []
  );

  const refresh = useCallback(() => {
    setRefreshTrigger((value) => value + 1);
  }, []);

  return { parents, loading, error, generateForMonth, refresh };
}
