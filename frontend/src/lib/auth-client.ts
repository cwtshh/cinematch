import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: `${import.meta.env.VITE_API_URL}/auth`,
  plugins: [
    inferAdditionalFields({
      user: {
        hasCompletedOnboarding: {
          type: "boolean",
          required: true,
        },
        hasCompletedInitialMovieRating: {
          type: "boolean",
          required: true,
        },
      },
    }),
  ],
});
