import { QueryClient, QueryCache } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) return;
      const msg = error instanceof Error ? error.message : "";
      if (/\b40[13]\b/.test(msg)) return;
      toast({
        title: "Failed to load data",
        description: msg || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});
