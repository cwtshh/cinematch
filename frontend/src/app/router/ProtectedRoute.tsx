import { authClient } from "@/lib/auth-client";
import { Navigate, Outlet, useLocation } from "react-router";
import { Loading } from "../../components/loading/Loading";

export function ProtectedRoute() {
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Loading />;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
