import { Input } from "@/components/ui/input";
import { AuthPanel } from "../components/AuthPanel";
import { Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { useNavigate } from "react-router";
import { useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  validateRegisterForm,
  type FormErrors,
} from "@/app/utils/validation/validateRegisterForm";
import { getAuthErrorMessage } from "@/app/utils/mappers/getAuthErrors";

export function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedData = useMemo(
    () => ({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      confirmPassword,
    }),
    [name, email, password, confirmPassword],
  );

  const validationErrors = useMemo(
    () => validateRegisterForm(normalizedData),
    [normalizedData],
  );

  const isFormInvalid =
    Object.keys(validationErrors).length > 0 || isSubmitting;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const currentErrors = validateRegisterForm(normalizedData);
    setErrors(currentErrors);

    if (Object.keys(currentErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const result = await authClient.signUp.email({
        name: normalizedData.name,
        email: normalizedData.email,
        password: normalizedData.password,
      });

      if (result?.error) {
        const message = getAuthErrorMessage(result.error);
        setErrors({ form: message });
        toast.error(message);
        return;
      }

      toast.success("Conta criada com sucesso.");

      navigate("/login");
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setErrors({ form: message });
      console.error("Erro ao criar conta:", error);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearFieldError(field: keyof FormErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
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
            Crie sua conta
          </h2>

          <p className="text-[#8A8FA8] text-sm font-inter mb-8">
            Cadastre-se para começar a usar a plataforma
          </p>

          <div className="flex flex-col items-center gap-3">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-center gap-6 my-6 w-full"
              noValidate
            >
              <Field>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError("name");
                  }}
                  autoComplete="name"
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400 font-inter">
                    {errors.name}
                  </p>
                )}
              </Field>

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
                  placeholder="Crie uma senha"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                  }}
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400 font-inter">
                    {errors.password}
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirmar senha
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  placeholder="Confirme sua senha"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError("confirmPassword");
                  }}
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400 font-inter">
                    {errors.confirmPassword}
                  </p>
                )}
              </Field>

              {errors.form && (
                <p className="w-full text-sm text-red-400 font-inter">
                  {errors.form}
                </p>
              )}

              <Button className="w-full" disabled={isFormInvalid} type="submit">
                {isSubmitting ? "Criando conta..." : "Criar conta"}
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
              Já tem conta?
            </p>

            <Button className="w-full" onClick={() => navigate("/login")}>
              Entrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
