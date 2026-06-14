import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { databasePlugin } from "@/infra/http/database";
import { appRoutes } from "@/router/routes";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
    },
    disableRequestLogging: false,
  });

  await app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  });

  await app.register(sensible);
  await app.register(databasePlugin);
  await app.register(appRoutes, {
    prefix: "/api",
  });

  app.setErrorHandler((error, request, reply) => {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as Record<string, unknown>).statusCode === "number"
        ? ((error as Record<string, unknown>).statusCode as number)
        : 500;

    const message =
      error instanceof Error ? error.message : "Internal server error";

    request.log.error(
      {
        err: error,
        method: request.method,
        url: request.url,
      },
      "Unhandled error",
    );

    return reply.status(statusCode).send({
      message,
    });
  });

  return app;
}
