import { useMemo, useState } from "react";
import axios from "axios";
import { ArrowRight, Flame } from "lucide-react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/axios";
import { eras, genres, popularityOptions } from "../types/OnBoardingTypes";
import { GenreChip } from "@/components/on-board/GenreChip";
import { authClient } from "@/lib/auth-client";

type SavePreferencesPayload = {
  genres: string[];
  era: string;
  popularity: string;
};

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

export function PreferencesOnboardingPage() {
  const navigate = useNavigate();
  const { refetch } = authClient.useSession();

  const [selectedGenres, setSelectedGenres] = useState<string[]>([
    "drama",
    "sci_fi",
  ]);
  const [selectedEra, setSelectedEra] = useState("any");
  const [selectedPopularity, setSelectedPopularity] = useState("any");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleGenre(genreSlug: string) {
    setSelectedGenres((current) =>
      current.includes(genreSlug)
        ? current.filter((slug) => slug !== genreSlug)
        : [...current, genreSlug],
    );
  }

  const isSubmitDisabled = selectedGenres.length === 0 || isSubmitting;

  const summary = useMemo(() => {
    const genreLabels = genres
      .filter((genre) => selectedGenres.includes(genre.slug))
      .map((genre) => genre.label);

    const eraLabel =
      eras.find((era) => era.id === selectedEra)?.label ?? "Qualquer época";

    const popularityLabel =
      popularityOptions.find((item) => item.id === selectedPopularity)?.label ??
      "Qualquer";

    return {
      genreLabels,
      eraLabel,
      popularityLabel,
    };
  }, [selectedGenres, selectedEra, selectedPopularity]);

  async function handleSubmit() {
    if (isSubmitDisabled) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    const payload: SavePreferencesPayload = {
      genres: selectedGenres,
      era: selectedEra,
      popularity: selectedPopularity,
    };

    try {
      await apiClient.post("/on-boarding/preferences", payload);
      await refetch();

      navigate("/initial-movie-rating", {
        replace: true,
        state: {
          onboardingPreferences: payload,
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as
          | ApiErrorResponse
          | undefined;

        setErrorMessage(
          responseData?.message ??
            responseData?.error ??
            "Não foi possível salvar suas preferências.",
        );
      } else {
        setErrorMessage("Ocorreu um erro inesperado.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="gap-2 rounded-full px-3 py-1"
              >
                <Flame className="h-3.5 w-3.5" />
                Configuração inicial
              </Badge>
            </div>

            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight">
                Conte pra gente o que você gosta
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm md:text-base">
                Escolha alguns sinais para o CineMatch começar com recomendações
                melhores. Você pode ajustar tudo depois.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              {summary.genreLabels.map((label) => (
                <Badge key={label} variant="default" className="rounded-full">
                  {label}
                </Badge>
              ))}

              <Badge variant="outline" className="rounded-full">
                {summary.eraLabel}
              </Badge>

              <Badge variant="outline" className="rounded-full">
                {summary.popularityLabel}
              </Badge>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            )}
          </CardHeader>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Gêneros</CardTitle>
            <CardDescription>
              Selecione pelo menos um gênero para orientar as recomendações.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {genres.map((genre) => (
                <GenreChip
                  key={genre.slug}
                  label={genre.label}
                  Icon={genre.icon}
                  selected={selectedGenres.includes(genre.slug)}
                  onClick={() => toggleGenre(genre.slug)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Época</CardTitle>
            <CardDescription>
              Defina se você quer explorar clássicos, nostalgia ou títulos mais
              recentes.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ToggleGroup
              type="single"
              value={selectedEra}
              onValueChange={(value) => value && setSelectedEra(value)}
              className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {eras.map((era) => (
                <ToggleGroupItem
                  key={era.id}
                  value={era.id}
                  className="h-12 rounded-xl border border-border bg-background text-sm data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {era.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Popularidade</CardTitle>
            <CardDescription>
              Escolha entre equilíbrio, blockbusters ou descobertas menos
              conhecidas.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <RadioGroup
              value={selectedPopularity}
              onValueChange={setSelectedPopularity}
              className="grid gap-3 lg:grid-cols-3"
            >
              {popularityOptions.map((option) => (
                <Label
                  key={option.id}
                  htmlFor={option.id}
                  className={cn(
                    "flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-colors",
                    selectedPopularity === option.id
                      ? "border-primary bg-accent"
                      : "border-border bg-background hover:bg-accent",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="block text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {option.description}
                      </span>
                    </div>

                    <RadioGroupItem id={option.id} value={option.id} />
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border bg-background/95 px-4 pb-4 pt-4 backdrop-blur md:-mx-6 md:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Preferências atuais
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.genreLabels.length} gêneros,{" "}
                {summary.eraLabel.toLowerCase()},{" "}
                {summary.popularityLabel.toLowerCase()}.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="min-w-55"
            >
              {isSubmitting
                ? "Salvando preferências..."
                : "Salvar preferências"}
              {!isSubmitting && <ArrowRight className="ml-2 h-4.5 w-4.5" />}
            </Button>
          </div>
        </div>

        <Separator className="opacity-0" />
      </div>
    </div>
  );
}
