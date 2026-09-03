import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { getCurrentUser } from "@/lib/auth";

export default function ProtectedRoute() {
  const location = useLocation();
  const authQuery = useQuery({ queryKey: ["auth-me"], queryFn: getCurrentUser, retry: false, staleTime: 60_000 });

  if (authQuery.isPending) {
    return <div className="flex min-h-screen items-center justify-center bg-background" data-testid="auth-loading-screen"><div className="text-center"><div className="mx-auto size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="mt-4 text-sm text-muted-foreground" data-testid="auth-loading-label">Verificando seu acesso...</p></div></div>;
  }

  if (authQuery.isError) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <Outlet />;
}