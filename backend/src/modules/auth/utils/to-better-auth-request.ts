import type { FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";

export function toBetterAuthRequest(request: FastifyRequest) {
  const origin = request.headers.origin ?? `http://${request.headers.host}`;

  const url = new URL(request.raw.url ?? request.url, origin);

  const method = request.method.toUpperCase();
  const headers = fromNodeHeaders(request.headers);

  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : request.body
        ? JSON.stringify(request.body)
        : undefined;

  return new Request(url.toString(), {
    method,
    headers,
    body,
  });
}
