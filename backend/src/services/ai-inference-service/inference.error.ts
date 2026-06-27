import axios from "axios";

export class InferenceServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "InferenceServiceError";
    this.statusCode = statusCode;
  }
}

export function mapInferenceAxiosError(error: unknown): InferenceServiceError {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : error.response?.status === 503
          ? "O motor de recomendação ainda está inicializando."
          : "Falha ao consultar o serviço de recomendação.";

    return new InferenceServiceError(message, error.response?.status ?? 502);
  }

  return new InferenceServiceError(
    "Falha inesperada ao consultar o serviço de recomendação.",
    502,
  );
}
