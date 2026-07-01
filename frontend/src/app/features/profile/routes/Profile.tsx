import { useEffect, useMemo, useState } from "react";
import { Check, Save, User } from "lucide-react";

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
import { authClient } from "@/lib/auth-client";
import { eras, genres, popularityOptions } from "../../on-board/types/OnBoardingTypes";
import { GenreChip } from "@/components/on-board/GenreChip";

type Preferences = {
  genres: string[];
  era: string;
  popularity: string;
};

export function ProfilePage() {
  const { data: session } = authClient.useSession();

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedEra, setSelectedEra] = useState("any");
  const [selectedPopularity, setSelectedPopularity] = useState("any");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await apiClient.get<Preferences>(
          "/on-boarding/preferences",
        );
        setSelectedGenres(data.genres);
        setSelectedEra(data.era);
        setSelectedPopularity(data.popularity);
      } catch {
        setErrorMessage("Não foi possível carregar suas preferências.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function toggleGenre(slug: string) {
    setSelectedGenres((curr) =>
      curr.includes(slug) ? curr.filter((s) => s !== slug) : [...curr, slug],
    );
  }

  const summary = useMemo(() => {
    const genreLabels = genres
      .filter((g) => selectedGenres.includes(g.slug))
      .map((g) => g.label);
    const eraLabel = eras.find((e) => e.id === selectedEra)?.label ?? "Qualquer época";
    const popularityLabel =
      popularityOptions.find((p) => p.id === selectedPopularity)?.label ?? "Qualquer";
    return { genreLabels, eraLabel, popularityLabel };
  }, [selectedGenres, selectedEra, selectedPopularity]);

  async function handleSave() {
    if (selectedGenres.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSaved(false);

    try {
      await apiClient.post("/on-boarding/preferences", {
        genres: selectedGenres,
        era: selectedEra,
        popularity: selectedPopularity,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setErrorMessage("Não foi possível salvar suas preferências.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">

        {/* Header do usuário */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-accent">
                <User className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">
                  {session?.user.name}
                </CardTitle>
                <CardDescription>{session?.user.email}</CardDescription>
              </div>
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

        {/* Gêneros */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Gêneros preferidos</CardTitle>
            <CardDescription>
              Selecione os gêneros que mais combinam com você.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-2xl bg-muted"
                  />
                ))}
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        {/* Época */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Época</CardTitle>
            <CardDescription>
              Clássicos, nostalgia ou lançamentos recentes?
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

        {/* Popularidade */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Popularidade</CardTitle>
            <CardDescription>
              Blockbusters, equilíbrio ou joias escondidas?
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
                  htmlFor={`profile-${option.id}`}
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
                    <RadioGroupItem id={`profile-${option.id}`} value={option.id} />
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Barra de salvar */}
        <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border bg-background/95 px-4 pb-4 pt-4 backdrop-blur md:-mx-6 md:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Preferências atuais
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.genreLabels.length > 0
                  ? `${summary.genreLabels.length} gêneros · ${summary.eraLabel} · ${summary.popularityLabel}`
                  : "Selecione pelo menos um gênero."}
              </p>
            </div>

            <Button
              type="button"
              onClick={handleSave}
              disabled={selectedGenres.length === 0 || isSubmitting}
              className="min-w-48"
            >
              {saved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Salvo!
                </>
              ) : isSubmitting ? (
                "Salvando..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar preferências
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator className="opacity-0" />
      </div>
    </div>
  );
}
