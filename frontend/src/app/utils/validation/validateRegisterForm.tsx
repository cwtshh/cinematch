export type FormErrors = {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

export function validateRegisterForm(data: {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}): FormErrors {
  const errors: FormErrors = {};

  const name = data.name.trim();
  const username = data.username.trim().toLowerCase();
  const email = data.email.trim().toLowerCase();
  const password = data.password;
  const confirmPassword = data.confirmPassword;

  if (!name) {
    errors.name = "Informe seu nome.";
  } else if (name.length < 2) {
    errors.name = "Seu nome deve ter pelo menos 2 caracteres.";
  }

  if (!username) {
    errors.username = "Informe seu username.";
  } else if (username.length < 3) {
    errors.username = "O username deve ter pelo menos 3 caracteres.";
  } else if (username.length > 20) {
    errors.username = "O username deve ter no máximo 20 caracteres.";
  } else if (!/^[a-z0-9_]+$/.test(username)) {
    errors.username =
      "O username pode conter apenas letras minúsculas, números e underscore.";
  }

  if (!email) {
    errors.email = "Informe seu email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Informe um email válido.";
  }

  if (!password) {
    errors.password = "Informe uma senha.";
  } else if (password.length < 8) {
    errors.password = "A senha deve ter pelo menos 8 caracteres.";
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = "A senha deve conter pelo menos uma letra e um número.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirme sua senha.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "As senhas não coincidem.";
  }

  return errors;
}
