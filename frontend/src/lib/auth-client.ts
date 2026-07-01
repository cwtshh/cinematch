import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: `${import.meta.env.VITE_API_URL ?? ""}/auth`,
  plugins: [
    usernameClient(),
    inferAdditionalFields({
      user: {
        hasCompletedOnboarding: {
          type: "boolean",
          required: false,
        },
        hasCompletedInitialMovieRating: {
          type: "boolean",
          required: false,
        },
      },
    }),
  ],
});
