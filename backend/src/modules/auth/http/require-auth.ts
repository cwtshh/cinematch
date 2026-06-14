import type { FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "@/infra/auth/auth";

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (!session?.user) {
    return reply.status(401).send({
      message: "Unauthorized",
    });
  }

  request.user = session.user;
  request.session = session.session;
}
