import { env } from "@/main/env";
import axios from "axios";

export const tmdbClient = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  timeout: 10000,
  headers: {
    Authorization: `Bearer ${env.TMDB_API_TOKEN}`,
    "Content-Type": "application/json",
  },
  params: {
    language: "pt-BR",
  },
});
