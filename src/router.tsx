import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { supabase } from "./integrations/supabase/client";

// Attach Supabase access token to server-function fetches so middleware
// like requireSupabaseAuth sees an Authorization header.
if (typeof window !== "undefined" && !(window as unknown as { __sbFetchPatched?: boolean }).__sbFetchPatched) {
  (window as unknown as { __sbFetchPatched?: boolean }).__sbFetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input instanceof Request
          ? input.url
          : "";
      if (url.includes("/_serverFn/")) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
          if (!headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
          return originalFetch(input, { ...init, headers });
        }
      }
    } catch (e) {
      console.error("[serverFn auth interceptor]", e);
    }
    return originalFetch(input, init);
  };
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
