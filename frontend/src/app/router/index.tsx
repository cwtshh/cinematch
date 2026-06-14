import Auth from "@/features/auth/routes/auth";
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/auth",
    element: <Auth />,
  },
]);
