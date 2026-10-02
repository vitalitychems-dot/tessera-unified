import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@/lib/queryClient";
import { type IndexedRepo, type InsertRepo } from "@/lib/types";

function parseWithLogging<T>(data: unknown, label: string): T {
  return data as T;
}

export function useRepos() {
  return useQuery({
    queryKey: ["/api/repos"],
    queryFn: async () => {
      const res = await fetch("/api/repos", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch repos");
      return parseWithLogging<IndexedRepo[]>(await res.json(), "repos.list");
    },
    // Poll more frequently if any repo is pending
    refetchInterval: (query) => {
      const data = query.state.data as IndexedRepo[] | undefined;
      const hasPending = data?.some(r => r.status === 'pending');
      return hasPending ? 3000 : false;
    }
  });
}

export function useCreateRepo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InsertRepo) => {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to index repository");
      return parseWithLogging<IndexedRepo>(await res.json(), "repos.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repos"] });
    },
  });
}

export function useDeleteRepo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl("/api/repos", { id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete repository");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repos"] });
    },
  });
}
