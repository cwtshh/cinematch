import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  withCredentials: true,
  timeout: 10000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Erros de cancelamento (AbortController) passam sem transformação
    // para que o name "CanceledError" seja preservado e detectado corretamente
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Ocorreu um erro na requisição.";
      return Promise.reject(new Error(message));
    }

    return Promise.reject(
      error instanceof Error ? error : new Error("Ocorreu um erro inesperado."),
    );
  },
);