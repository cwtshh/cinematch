import { createBrowserRouter, Navigate } from "react-router";
import { Login } from "../features/auth/routes/Login";
import { Register } from "../features/auth/routes/Register";
import { AppLayout } from "../layout/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppGate } from "./gates/AppGate";
import { OnboardingGate } from "./gates/OnBoardingGate";
import { PreferencesOnboardingPage } from "../features/on-board/routes/PreferencesOnboarding";
import { PublicGate } from "./gates/PublicGate";

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <OnboardingGate />,
        children: [
          {
            path: "/onboarding",
            element: <PreferencesOnboardingPage />,
          },
        ],
      },
      {
        element: <AppGate />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                path: "/",
                element: <Navigate to="/for-you" replace />,
              },
              {
                path: "/for-you",
                element: <div>Home</div>,
              },
              {
                path: "/search",
                element: <div>Search</div>,
              },
              {
                path: "/preferences",
                element: <div>Preferences</div>,
              },
              {
                path: "/profile",
                element: <div>Profile</div>,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <PublicGate />,
    children: [
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
    ],
  },
]);
