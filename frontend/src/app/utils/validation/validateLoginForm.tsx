export type FormErrors = {
  email?: string;
  password?: string;
  form?: string;
};

export function validateLoginForm(data: {
  email: string;
  password: string;
}): FormErrors {
  const errors: FormErrors = {};

  const identifier = data.email.trim();
  const password = data.password;

  if (!identifier) {
    errors.email = "Informe seu email ou nome de usuário.";
  } else if (identifier.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
    errors.email = "Informe um email válido.";
  }

  if (!password) {
    errors.password = "Informe sua senha.";
  } else if (password.length < 6) {
    errors.password = "A senha parece inválida.";
  }

  return errors;
}
