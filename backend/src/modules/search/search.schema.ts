import { z } from "zod";

export const searchMoviesQuerystringSchema = z.object({
  title: z.string().optional(),
  year: z.coerce.number().optional(), 
  genreText: z.string().optional(),
  releaseDateStart: z.string().optional(),
  releaseDateEnd: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

export type SearchMoviesQuerystring = z.infer<
  typeof searchMoviesQuerystringSchema
>;