import type { FastifyReply, FastifyRequest } from "fastify";
import { generateRecommendationsForUser } from "@/services/ai-inference-service/generate-recommendations";
import { InferenceServiceError } from "@/services/ai-inference-service/inference.error";
import { auth } from "@/infra/auth/auth";
import { generateRecommendationsBodySchema } from "@/services/ai-inference-service/ai-inference.schema";

export async function generateRecommendationsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return reply.status(401).send({
      message: "Não autenticado.",
    });
  }

  const body = generateRecommendationsBodySchema.parse(request.body ?? {});

  try {
    const items = await generateRecommendationsForUser({
      userId: session.user.id,
      nRecommendations: body.nRecommendations ?? 10,
    });

    return reply.send({ items });
  } catch (error) {
    if (error instanceof InferenceServiceError) {
      return reply.status(error.statusCode).send({
        message: error.message,
      });
    }

    request.log.error(error);

    return reply.status(500).send({
      message: "Erro interno ao gerar recomendações.",
    });
  }
}
