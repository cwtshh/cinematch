import type { FastifyRequest, FastifyReply } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "@/infra/auth/auth";
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

  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  const userId = session?.user.id;

  const { title, year, genreText, page, limit } = parsed.data;

  const { movies, hasMore } = await searchMoviesAction({
    title,
    year,
    genreText,
    page,
    limit,
    userId,
  });

  return reply.send({
    data: movies,
    meta: {
      page,
      limit,
      count: movies.length,
      hasMore,
    },
  });
}