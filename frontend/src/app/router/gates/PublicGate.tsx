import { Loading } from "@/components/loading/Loading";
import { authClient } from "@/lib/auth-client";
import { Navigate, Outlet } from "react-router";

export function PublicGate() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Loading />;
  }

  if (session?.user) {
    const hasCompletedOnboarding = session.user.hasCompletedOnboarding === true;

    return (
      <Navigate
        to={hasCompletedOnboarding ? "/for-you" : "/onboarding"}
        replace
      />
    );
  }

  return <Outlet />;
}
