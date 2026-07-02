import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, inArray } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "@/infra/auth/auth";
import { db } from "@/infra/database/client";
import {
  movie,
  recommendedFeed,
  recommendedFeedItem,
  userDismissedMovie,
  userMovieRating,
} from "@/infra/database/drizzle/schema";
import { dismissedParamsSchema } from "./dismissed.schema";

export async function dismissMovieHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsed = dismissedParamsSchema.safeParse(request.params);
  if (!parsed.success) return reply.status(400).send({ message: "Parâmetros inválidos." });

  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  const userId = session?.user.id;
  if (!userId) return reply.status(401).send({ message: "Não autenticado." });

  const { movieId } = parsed.data;

  const [movieRow] = await db.select({ id: movie.id }).from(movie).where(eq(movie.id, movieId)).limit(1);
  if (!movieRow) return reply.status(404).send({ message: "Filme não encontrado." });

  await db
    .insert(userDismissedMovie)
    .values({ userId, movieId })
    .onConflictDoNothing();

  // Descartar é prioritário: remove avaliação e reseta feedItems para "dismissed"
  await db
    .delete(userMovieRating)
    .where(and(eq(userMovieRating.userId, userId), eq(userMovieRating.movieId, movieId)));

  const feeds = await db
    .select({ id: recommendedFeed.id })
    .from(recommendedFeed)
    .where(eq(recommendedFeed.userId, userId));

  if (feeds.length > 0) {
    const feedIds = feeds.map((f) => f.id);
    for (const feedId of feedIds) {
      await db
        .update(recommendedFeedItem)
        .set({ status: "dismissed", userRating: null, ratedAt: null })
        .where(
          and(
            eq(recommendedFeedItem.feedId, feedId),
            eq(recommendedFeedItem.movieId, movieId),
          ),
        );
    }
  }

  return reply.status(200).send({ movieId, dismissed: true });
}

export async function undismissMovieHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsed = dismissedParamsSchema.safeParse(request.params);
  if (!parsed.success) return reply.status(400).send({ message: "Parâmetros inválidos." });

  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  const userId = session?.user.id;
  if (!userId) return reply.status(401).send({ message: "Não autenticado." });

  const { movieId } = parsed.data;

  await db
    .delete(userDismissedMovie)
    .where(and(eq(userDismissedMovie.userId, userId), eq(userDismissedMovie.movieId, movieId)));

  return reply.status(200).send({ movieId, dismissed: false });
}

export async function getDismissedMoviesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  const userId = session?.user.id;
  if (!userId) return reply.status(401).send({ message: "Não autenticado." });

  const rows = await db
    .select({ movieId: userDismissedMovie.movieId, dismissedAt: userDismissedMovie.dismissedAt })
    .from(userDismissedMovie)
    .where(eq(userDismissedMovie.userId, userId));

  return reply.status(200).send({ dismissed: rows });
}
