import type { FastifyRequest, FastifyReply } from "fastify";
import { searchMoviesQuerystringSchema } from "./search.schema";
import { searchMoviesAction } from "./search-movies";

export async function searchMoviesHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const parsed = searchMoviesQuerystringSchema.safeParse(request.query);

  if (!parsed.success) {
    return reply.status(400).send({
      message: "Parâmetros de busca inválidos.",
      issues: parsed.error.flatten(),
    });
  }

  const { title, year, genreText, releaseDateStart, releaseDateEnd, page, limit } = parsed.data;

  const movies = await searchMoviesAction({
    title,
    year,
    genreText,
    releaseDateStart,
    releaseDateEnd,
    page,
    limit,
  });

  return reply.send({
    data: movies,
    meta: {
      page,
      limit,
      count: movies.length,
    },
  });
}