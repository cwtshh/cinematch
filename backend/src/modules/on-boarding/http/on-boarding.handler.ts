import type { FastifyReply, FastifyRequest } from "fastify";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/infra/database/client";
import {
  genre,
  user,
  userPreference,
  userPreferenceGenre,
} from "@/infra/database/drizzle/schema";
import type { SaveOnBoardingPreferencesBody } from "./on-boarding.schema";

type SaveOnBoardingPreferencesRequest = FastifyRequest<{
  Body: SaveOnBoardingPreferencesBody;
}>;

export async function saveOnBoardingPreferencesHandler(
  request: SaveOnBoardingPreferencesRequest,
  reply: FastifyReply,
) {
  const userId = request.user?.id;

  if (!userId) {
    return reply.status(401).send({
      message: "Usuário não autenticado.",
    });
  }

  const { genres, era, popularity } = request.body;

  const existingGenres = await db
    .select({
      id: genre.id,
      slug: genre.slug,
    })
    .from(genre)
    .where(inArray(genre.slug, genres));

  if (existingGenres.length !== genres.length) {
    return reply.status(400).send({
      message: "Um ou mais gêneros informados são inválidos.",
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(userPreference)
      .values({
        userId,
        era,
        popularity,
      })
      .onConflictDoUpdate({
        target: userPreference.userId,
        set: {
          era,
          popularity,
          updatedAt: new Date(),
        },
      });

    await tx
      .delete(userPreferenceGenre)
      .where(eq(userPreferenceGenre.userId, userId));

    if (existingGenres.length > 0) {
      await tx.insert(userPreferenceGenre).values(
        existingGenres.map((item) => ({
          userId,
          genreId: item.id,
        })),
      );
    }

    await tx
      .update(user)
      .set({
        hasCompletedOnboarding: true,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));
  });

  return reply.status(200).send({
    message: "Preferências salvas com sucesso.",
  });
}
