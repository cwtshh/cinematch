import type { FastifyReply, FastifyRequest } from "fastify";

import { auth } from "@/infra/auth/auth";
import { toBetterAuthRequest } from "../utils/to-better-auth-request";

export async function handleAuthRequest(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const betterAuthRequest = toBetterAuthRequest(request);
  const response = await auth.handler(betterAuthRequest);

  reply.status(response.status);

  response.headers.forEach((value, key) => {
    reply.header(key, value);
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = await response.json();
    return reply.send(json);
  }

  const text = await response.text();
  return reply.send(text || null);
}
