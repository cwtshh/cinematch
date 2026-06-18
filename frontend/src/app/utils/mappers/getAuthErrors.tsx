export function getAuthErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Ocorreu um erro ao criar a conta. Tente novamente.";
  }

  const err = error as {
    message?: string;
    code?: string;
    status?: number;
  };

  const message = err.message?.toLowerCase() ?? "";
  const code = err.code?.toLowerCase() ?? "";

  if (
    code.includes("user_already_exists") ||
    message.includes("already exists") ||
    message.includes("user already exists") ||
    message.includes("duplicate")
  ) {
    return "Já existe uma conta com esse email.";
  }

  if (code.includes("invalid_email") || message.includes("invalid email")) {
    return "O email informado é inválido.";
  }

  if (
    code.includes("invalid_password") ||
    message.includes("invalid password")
  ) {
    return "A senha informada não atende aos requisitos.";
  }

  if (code.includes("signup_disabled") || message.includes("signup disabled")) {
    return "O cadastro está desabilitado no momento.";
  }

  return err.message || "Ocorreu um erro ao criar a conta. Tente novamente.";
}
