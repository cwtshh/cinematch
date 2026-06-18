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

  const email = data.email.trim().toLowerCase();
  const password = data.password;

  if (!email) {
    errors.email = "Informe seu email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Informe um email válido.";
  }

  if (!password) {
    errors.password = "Informe sua senha.";
  } else if (password.length < 6) {
    errors.password = "A senha parece inválida.";
  }

  return errors;
}
