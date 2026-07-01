import { z } from "zod";

export const saveOnBoardingPreferencesBodySchema = z.object({
  genres: z.array(z.string().min(1)).min(1, "Selecione pelo menos um gênero."),
  era: z.enum(["any", "before-1980", "80s-90s", "2000-plus"]),
  popularity: z.enum(["any", "popular", "hidden-gems"]),
});

export type SaveOnBoardingPreferencesBody = z.infer<
  typeof saveOnBoardingPreferencesBodySchema
>;
