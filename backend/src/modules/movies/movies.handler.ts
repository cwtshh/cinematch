import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "@/infra/auth/auth";
import { db } from "@/infra/database/client";
import {
  movie,
  recommendedFeed,
  recommendedFeedItem,
  userMovieRating,
} from "@/infra/database/drizzle/schema";
import { movieParamsSchema, rateMovieBodySchema } from "./movies.schema";

export async function rateMovieHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsedParams = movieParamsSchema.safeParse(request.params);
  const parsedBody = rateMovieBodySchema.safeParse(request.body);

  if (!parsedParams.success || !parsedBody.success) {
    return reply.status(400).send({ message: "Parâmetros inválidos." });
  }

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  const userId = session?.user.id;
  if (!userId) return reply.status(401).send({ message: "Não autenticado." });

  const { movieId } = parsedParams.data;
  const { rating } = parsedBody.data;

  const [movieRow] = await db
    .select({ id: movie.id })
    .from(movie)
    .where(eq(movie.id, movieId))
    .limit(1);

  if (!movieRow) {
    return reply.status(404).send({ message: "Filme não encontrado." });
  }

  // grava / atualiza na tabela canônica
  await db
    .insert(userMovieRating)
    .values({ userId, movieId, rating })
    .onConflictDoUpdate({
      target: [userMovieRating.userId, userMovieRating.movieId],
      set: { rating, updatedAt: sql`now()` },
    });

  // sincroniza com feedItems do usuário para esse filme
  const feeds = await db
    .select({ id: recommendedFeed.id })
    .from(recommendedFeed)
    .where(eq(recommendedFeed.userId, userId));

  if (feeds.length > 0) {
    const feedIds = feeds.map((f) => f.id);
    const now = new Date();
    for (const feedId of feedIds) {
      await db
        .update(recommendedFeedItem)
        .set({ status: "rated", userRating: rating, ratedAt: now })
        .where(
          and(
            eq(recommendedFeedItem.feedId, feedId),
            eq(recommendedFeedItem.movieId, movieId),
          ),
        );
    }
  }

  return reply.status(200).send({ movieId, rating });
}

export async function unrateMovieHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsedParams = movieParamsSchema.safeParse(request.params);
  if (!parsedParams.success) return reply.status(400).send({ message: "Parâmetros inválidos." });

  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  const userId = session?.user.id;
  if (!userId) return reply.status(401).send({ message: "Não autenticado." });

  const { movieId } = parsedParams.data;

  await db
    .delete(userMovieRating)
    .where(and(eq(userMovieRating.userId, userId), eq(userMovieRating.movieId, movieId)));

  // remove avaliação dos feedItems também
  const feeds = await db
    .select({ id: recommendedFeed.id })
    .from(recommendedFeed)
    .where(eq(recommendedFeed.userId, userId));

  if (feeds.length > 0) {
    const feedIds = feeds.map((f) => f.id);
    for (const feedId of feedIds) {
      await db
        .update(recommendedFeedItem)
        .set({ status: "pending", userRating: null, ratedAt: null })
        .where(
          and(
            eq(recommendedFeedItem.feedId, feedId),
            eq(recommendedFeedItem.movieId, movieId),
          ),
        );
    }
  }

  return reply.status(200).send({ movieId, rating: null });
}
