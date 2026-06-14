import "dotenv/config";
import { buildApp } from "./app";
import { env } from "./env";

const app = await buildApp();

async function start() {
  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT,
    });

    app.log.info(`HTTP server listening on ${env.HOST}:${env.PORT}`);
  } catch (error) {
    app.log.error(error, "Failed to start server");
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  app.log.info({ signal }, "Shutting down server");

  try {
    await app.close();
    app.log.info("Server closed gracefully");
    process.exit(0);
  } catch (error) {
    app.log.error(error, "Error during shutdown");
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

await start();
