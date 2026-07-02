import { useEffect, useMemo, useState } from "react";
import { Check, Save, User, Trash2, KeyRound, Pencil, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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

type EditField = "name" | "username" | "password" | null;

export function ProfilePage() {
  const { data: session, refetch } = authClient.useSession();
  const navigate = useNavigate();

  // ── Conta ─────────────────────────────────────────────────────────────────
  const [editField, setEditField] = useState<EditField>(null);
  const [nameInput, setNameInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  function startEdit(field: EditField) {
    setEditField(field);
    setAccountError(null);
    setAccountSuccess(null);
    if (field === "name") setNameInput(session?.user.name ?? "");
    if (field === "username") setUsernameInput((session?.user as { username?: string }).username ?? "");
    if (field === "password") {
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  function cancelEdit() {
    setEditField(null);
    setAccountError(null);
  }

  async function saveName() {
    if (!nameInput.trim() || isSavingAccount) return;
    setIsSavingAccount(true);
    setAccountError(null);
    const { error } = await authClient.updateUser({ name: nameInput.trim() });
    if (error) {
      setAccountError("Não foi possível atualizar o nome.");
    } else {
      await refetch();
      setEditField(null);
      flash("Nome atualizado!");
    }
    setIsSavingAccount(false);
  }

  async function saveUsername() {
    if (!usernameInput.trim() || isSavingAccount) return;
    setIsSavingAccount(true);
    setAccountError(null);
    const { error } = await authClient.updateUser({ username: usernameInput.trim() } as Parameters<typeof authClient.updateUser>[0]);
    if (error) {
      setAccountError(error.message ?? "Não foi possível atualizar o username.");
    } else {
      await refetch();
      setEditField(null);
      flash("Username atualizado!");
    }
    setIsSavingAccount(false);
  }

  function translateAuthError(msg?: string): string {
    const m = msg?.toLowerCase() ?? "";
    if (m.includes("incorrect password") || m.includes("invalid password") || m.includes("wrong password")) return "Senha atual incorreta.";
    if (m.includes("password is too short") || m.includes("password too short")) return "A nova senha deve ter pelo menos 8 caracteres.";
    if (m.includes("username already") || m.includes("username taken")) return "Esse username já está em uso.";
    if (m.includes("user not found")) return "Usuário não encontrado.";
    if (m.includes("unauthorized") || m.includes("unauthenticated")) return "Sessão expirada. Faça login novamente.";
    return msg ?? "Ocorreu um erro. Tente novamente.";
  }

  async function savePassword() {
    if (!currentPassword || !newPassword || isSavingAccount) return;
    if (newPassword.length < 8) {
      setAccountError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setAccountError("A nova senha deve conter pelo menos uma letra e um número.");
      return;
    }
    setIsSavingAccount(true);
    setAccountError(null);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    if (error) {
      setAccountError(translateAuthError(error.message));
    } else {
      setEditField(null);
      flash("Senha alterada com sucesso!");
    }
    setIsSavingAccount(false);
  }

  async function handleDeleteAccount() {
    if (!deletePassword) {
      setAccountError("Informe sua senha para confirmar a exclusão.");
      return;
    }
    setIsSavingAccount(true);
    setAccountError(null);
    const { error } = await authClient.deleteUser({
      password: deletePassword,
    } as Parameters<typeof authClient.deleteUser>[0]);
    if (error) {
      setAccountError(translateAuthError(error.message));
      setShowDeleteConfirm(false);
    } else {
      navigate("/login");
    }
    setIsSavingAccount(false);
  }

  function flash(msg: string) {
    setAccountSuccess(msg);
    setTimeout(() => setAccountSuccess(null), 3000);
  }

  // ── Preferências ──────────────────────────────────────────────────────────
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedEra, setSelectedEra] = useState("any");
  const [selectedPopularity, setSelectedPopularity] = useState("any");
  const [isPrefLoading, setIsPrefLoading] = useState(true);
  const [isSavingPref, setIsSavingPref] = useState(false);
  const [isRefreshingRec, setIsRefreshingRec] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await apiClient.get<Preferences>("/on-boarding/preferences");
        setSelectedGenres(data.genres);
        setSelectedEra(data.era);
        setSelectedPopularity(data.popularity);
      } catch {
        setPrefError("Não foi possível carregar suas preferências.");
      } finally {
        setIsPrefLoading(false);
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

  async function handleSavePref() {
    if (selectedGenres.length === 0 || isSavingPref) return;
    setIsSavingPref(true);
    setPrefError(null);
    setPrefSaved(false);
    try {
      await apiClient.post("/on-boarding/preferences", {
        genres: selectedGenres,
        era: selectedEra,
        popularity: selectedPopularity,
      });
    } catch {
      setPrefError("Não foi possível salvar suas preferências.");
      setIsSavingPref(false);
      return;
    }
    setIsSavingPref(false);
    setIsRefreshingRec(true);
    try {
      await apiClient.post("/recommendations/refresh", { limit: 10 });
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 3000);
    } catch {
      setPrefError("Preferências salvas! Mas não foi possível atualizar as recomendações agora. Tente novamente mais tarde.");
      setPrefSaved(true);
      setTimeout(() => { setPrefSaved(false); setPrefError(null); }, 5000);
    } finally {
      setIsRefreshingRec(false);
    }
  }

  const user = session?.user as { name?: string; email?: string; username?: string } | undefined;

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">

        {/* ── Cabeçalho ── */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-accent">
                <User className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">{user?.name}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
                {user?.username && (
                  <p className="mt-0.5 text-xs text-muted-foreground">@{user.username}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {summary.genreLabels.map((label) => (
                <Badge key={label} variant="default" className="rounded-full">{label}</Badge>
              ))}
              <Badge variant="outline" className="rounded-full">{summary.eraLabel}</Badge>
              <Badge variant="outline" className="rounded-full">{summary.popularityLabel}</Badge>
            </div>
          </CardHeader>
        </Card>

        {/* ── Conta ── */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Conta</CardTitle>
            <CardDescription>Gerencie suas informações pessoais.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {accountError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {accountError}
              </div>
            )}
            {accountSuccess && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                {accountSuccess}
              </div>
            )}

            {/* Nome */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nome</p>
                {editField === "name" ? (
                  <Input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                    className="mt-1 h-8 text-sm"
                  />
                ) : (
                  <p className="mt-0.5 text-sm">{user?.name ?? "—"}</p>
                )}
              </div>
              {editField === "name" ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveName} disabled={isSavingAccount}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => startEdit("name")}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Username */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Username</p>
                {editField === "username" ? (
                  <Input
                    autoFocus
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveUsername()}
                    className="mt-1 h-8 text-sm"
                    placeholder="seunome"
                  />
                ) : (
                  <p className="mt-0.5 text-sm">
                    {user?.username ? `@${user.username}` : <span className="text-muted-foreground">Não definido</span>}
                  </p>
                )}
              </div>
              {editField === "username" ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveUsername} disabled={isSavingAccount}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => startEdit("username")}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Senha */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Senha</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">••••••••</p>
                </div>
                {editField !== "password" && (
                  <Button size="sm" variant="ghost" onClick={() => startEdit("password")}>
                    <KeyRound className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {editField === "password" && (
                <div className="mt-3 flex flex-col gap-2">
                  <Input
                    type="password"
                    placeholder="Senha atual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="password"
                    placeholder="Nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && savePassword()}
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={savePassword} disabled={isSavingAccount || !currentPassword || !newPassword}>
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Zona de perigo ── */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Zona de perigo</CardTitle>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                className="w-full justify-start gap-2"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Excluir minha conta
              </Button>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
                <p className="text-sm font-semibold text-red-300">Tem certeza?</p>
                <p className="text-sm text-red-200/80">
                  Essa ação é <strong>irreversível</strong>. Todos os seus dados serão apagados permanentemente.
                </p>
                <Input
                  type="password"
                  placeholder="Digite sua senha para confirmar"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAccount}
                    disabled={isSavingAccount || !deletePassword}
                  >
                    {isSavingAccount ? "Excluindo..." : "Sim, excluir minha conta"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); }}
                    disabled={isSavingAccount}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* ── Preferências ── */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Preferências de recomendação</h2>

          {prefError && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {prefError}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* Gêneros */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl">Gêneros preferidos</CardTitle>
                <CardDescription>Selecione os gêneros que mais combinam com você.</CardDescription>
              </CardHeader>
              <CardContent>
                {isPrefLoading ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted" />
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
                <CardDescription>Clássicos, nostalgia ou lançamentos recentes?</CardDescription>
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
                <CardDescription>Blockbusters, equilíbrio ou joias escondidas?</CardDescription>
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
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className="block text-sm text-muted-foreground">{option.description}</span>
                        </div>
                        <RadioGroupItem id={`profile-${option.id}`} value={option.id} />
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Barra de salvar preferências ── */}
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
              onClick={handleSavePref}
              disabled={selectedGenres.length === 0 || isSavingPref || isRefreshingRec}
              className="min-w-48"
            >
              {prefSaved ? (
                <><Check className="mr-2 h-4 w-4" />Salvo!</>
              ) : isRefreshingRec ? (
                "Atualizando recomendações..."
              ) : isSavingPref ? (
                "Salvando..."
              ) : (
                <><Save className="mr-2 h-4 w-4" />Salvar preferências</>
              )}
            </Button>
          </div>
        </div>

        <Separator className="opacity-0" />
      </div>
    </div>
  );
}
