import { createBrowserRouter, Navigate } from "react-router";
import { Login } from "../features/auth/routes/Login";
import { Register } from "../features/auth/routes/Register";
import { AppLayout } from "../layout/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppGate } from "./gates/AppGate";
import { PreferencesOnboardingPage } from "../features/on-board/routes/PreferencesOnboarding";
import { PublicGate } from "./gates/PublicGate";
import { InitialMovieRatingPage } from "../features/on-board/routes/InitialMovieRating";
import { ForYou } from "../features/for-you/routes/ForYou";
import { History } from "../features/history/routes/History";
import { Search } from "../features/search/routes/Search";
import { ProfilePage } from "../features/profile/routes/Profile";
import { WatchlistPage } from "../features/watchlist/routes/Watchlist";
import { StatsPage } from "../features/stats/routes/Stats";

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppGate />,
        children: [
          {
            path: "/onboarding",
            element: <PreferencesOnboardingPage />,
          },
          {
            path: "/initial-movie-rating",
            element: <InitialMovieRatingPage />,
          },
          {
            element: <AppLayout />,
            children: [
              {
                path: "/",
                element: <Navigate to="/for-you" replace />,
              },
              {
                path: "/for-you",
                element: <ForYou />,
              },
              {
                path: "/search",
                element: <Search />,
              },
              {
                path: "/historico",
                element: <History />,
              },
              {
                path: "/lista",
                element: <WatchlistPage />,
              },
              {
                path: "/estatisticas",
                element: <StatsPage />,
              },
              {
                path: "/profile",
                element: <ProfilePage />,
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
