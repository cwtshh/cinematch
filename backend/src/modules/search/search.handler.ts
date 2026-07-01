import type { FastifyRequest, FastifyReply } from "fastify";
import { searchMoviesQuerystringSchema } from "./search.schema";
import { searchMoviesAction } from "./search-movies";

export async function searchMoviesHandler(
  request: FastifyRequest, 
  reply: FastifyReply
) {
  const { title, year, genreText, releaseDateStart, releaseDateEnd, page, limit } = 
    searchMoviesQuerystringSchema.parse(request.query);

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