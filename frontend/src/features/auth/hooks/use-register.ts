import { signUp } from "../api/auth-client";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export async function register(input: RegisterInput) {
  return signUp.email({
    name: input.name,
    email: input.email,
    password: input.password,
  });
}
