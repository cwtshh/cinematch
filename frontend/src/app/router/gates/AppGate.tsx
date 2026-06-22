import { authClient } from "@/lib/auth-client";
import { Navigate, Outlet, useLocation } from "react-router";
import { Loading } from "../../../components/loading/Loading";

export function AppGate() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) {
    return <Loading />;
  }

  const pathname = location.pathname;

  if (!session?.user?.hasCompletedOnboarding) {
    if (pathname !== "/onboarding") {
      return <Navigate to="/onboarding" replace />;
    }

    return <Outlet />;
  }

  if (!session.user.hasCompletedInitialMovieRating) {
    if (pathname !== "/initial-movie-rating") {
      return <Navigate to="/initial-movie-rating" replace />;
    }

    return <Outlet />;
  }

  if (pathname === "/onboarding" || pathname === "/initial-movie-rating") {
    return <Navigate to="/for-you" replace />;
  }

  return <Outlet />;
}
