import { signIn } from "../api/auth-client";

export type LoginInput = {
  email: string;
  password: string;
};

export async function login(input: LoginInput) {
  return signIn.email({
    email: input.email,
    password: input.password,
  });
}
