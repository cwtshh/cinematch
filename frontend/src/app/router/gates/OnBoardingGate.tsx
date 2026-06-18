import { Loading } from "@/components/loading/Loading";
import { authClient } from "@/lib/auth-client";
import { Navigate, Outlet } from "react-router";

export function OnboardingGate() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Loading />;
  }

  if (session?.user?.hasCompletedOnboarding) {
    return <Navigate to="/for-you" replace />;
  }

  return <Outlet />;
}
