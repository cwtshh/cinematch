import { authClient } from "@/lib/auth-client";
import { Navigate, Outlet } from "react-router";
import { Loading } from "../../../components/loading/Loading";

export function AppGate() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Loading />;
  }

  if (!session?.user?.hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
