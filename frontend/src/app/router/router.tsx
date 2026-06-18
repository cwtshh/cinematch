import { createBrowserRouter, Navigate } from "react-router";
import { Login } from "../features/auth/routes/Login";
import { Register } from "../features/auth/routes/Register";
import { AppLayout } from "../layout/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: "/",
            element: <Navigate to="/for-you" />,
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
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
]);
