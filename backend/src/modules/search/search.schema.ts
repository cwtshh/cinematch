import { z } from "zod";

export const searchMoviesQuerystringSchema = z.object({
  title: z.string().max(200).optional(),
  year: z.coerce.number().optional(),
  genreText: z.string().max(100).optional(),
  releaseDateStart: z.string().optional(),
  releaseDateEnd: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  // Estrategia de busca por titulo. Default "sql" mantem o
  // comportamento historico para qualquer cliente que nao conheca o
  // parametro.
  mode: z.enum(["sql", "index", "both"]).default("sql"),
});

export type SearchMoviesQuerystring = z.infer<
  typeof searchMoviesQuerystringSchema
>;

export const autocompleteQuerystringSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
