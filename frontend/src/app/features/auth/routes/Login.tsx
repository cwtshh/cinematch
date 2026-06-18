import { Input } from "@/components/ui/input";
import { AuthPanel } from "../components/AuthPanel";
import { Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { useLocation, useNavigate } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { getAuthErrorMessage } from "@/app/utils/mappers/getAuthErrors";
import { validateLoginForm } from "@/app/utils/validation/validateLoginForm";
import type { FormErrors } from "@/app/utils/validation/validateRegisterForm";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: session, refetch } = authClient.useSession();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedSuccessfully, setHasSubmittedSuccessfully] =
    useState(false);

  const normalizedData = useMemo(
    () => ({
      email: email.trim().toLowerCase(),
      password,
    }),
    [email, password],
  );

  const validationErrors = useMemo(
    () => validateLoginForm(normalizedData),
    [normalizedData],
  );

  const isFormInvalid =
    Object.keys(validationErrors).length > 0 || isSubmitting;

  const redirectTo =
    location.state?.from?.pathname &&
    typeof location.state.from.pathname === "string"
      ? location.state.from.pathname
      : "/for-you";

  function clearFieldError(field: keyof FormErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
  }

  useEffect(() => {
    if (hasSubmittedSuccessfully && session) {
      navigate(redirectTo, { replace: true });
    }
  }, [hasSubmittedSuccessfully, session, navigate, redirectTo]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const currentErrors = validateLoginForm(normalizedData);
    setErrors(currentErrors);

    if (Object.keys(currentErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.email({
        email: normalizedData.email,
        password: normalizedData.password,
      });

      if (result?.error) {
        const message = getAuthErrorMessage(result.error);
        setErrors({ form: message });
        toast.error(message);
        return;
      }

      await refetch();
      setHasSubmittedSuccessfully(true);
      toast.success("Login realizado com sucesso.");
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setErrors({ form: message });
      console.error("Erro ao fazer login:", error);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <AuthPanel />

      <div className="flex-1 flex flex-col justify-center px-6 md:px-12 py-12 overflow-y-auto">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex flex-col items-center mb-10 md:hidden">
            <div className="w-16 h-16 rounded-3xl bg-[#F5A623]/15 border border-[#F5A623]/20 flex items-center justify-center mb-4 shadow-[0_0_32px_rgba(245,166,35,0.12)]">
              <Clapperboard
                size={30}
                className="text-[#F5A623]"
                strokeWidth={1.5}
              />
            </div>

            <h1 className="text-4xl font-black text-[#F0F0F0] tracking-tight">
              CineMatch
            </h1>

            <p className="text-[#8A8FA8] text-sm mt-1.5 font-inter">
              Filmes que combinam com você.
            </p>
          </div>

          <h2 className="text-3xl font-black text-[#F0F0F0] mb-1.5">
            Bem-vindo de volta
          </h2>

          <p className="text-[#8A8FA8] text-sm font-inter mb-8">
            Entre na sua conta para continuar
          </p>

          <div className="flex flex-col items-center gap-3">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-center gap-6 my-6 w-full"
              noValidate
            >
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  placeholder="email@email.com"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400 font-inter">
                    {errors.email}
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <Input
                  id="password"
                  placeholder="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                  }}
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400 font-inter">
                    {errors.password}
                  </p>
                )}
              </Field>

              {errors.form && (
                <p className="w-full text-sm text-red-400 font-inter">
                  {errors.form}
                </p>
              )}

              <Button className="w-full" disabled={isFormInvalid} type="submit">
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-px bg-white/6" />
              <span className="text-[#3A3F52] text-xs font-inter">ou</span>
              <div className="flex-1 h-px bg-white/6" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-5">
            <p className="text-center text-[#8A8FA8] text-sm mt-8 font-inter">
              Não tem conta?
            </p>

            <Button
              className="w-full"
              type="button"
              onClick={() => navigate("/register")}
              disabled={isSubmitting}
            >
              Registre-se
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
