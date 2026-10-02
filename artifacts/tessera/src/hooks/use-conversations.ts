import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@/lib/queryClient";
import { type Conversation, type InsertConversation } from "@/lib/types";
import { useLocation } from "wouter";

// Helper to log and return data
function parseWithLogging<T>(data: unknown, label: string): T {
  // Assuming data matches the schema from the API correctly 
  // In a robust implementation we'd use Zod safeParse here
  return data as T;
}

export function useConversations() {
  return useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return parseWithLogging<Conversation[]>(await res.json(), "conversations.list");
    },
  });
}

export function useConversation(id: number | null) {
  return useQuery({
    queryKey: ["/api/conversations", id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl("/api/conversations", { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return parseWithLogging<Conversation>(await res.json(), "conversations.get");
    },
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (data: InsertConversation) => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      return parseWithLogging<Conversation>(await res.json(), "conversations.create");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setLocation(`/c/${data.id}`);
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl("/api/conversations", { id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete conversation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setLocation("/");
    },
  });
}
