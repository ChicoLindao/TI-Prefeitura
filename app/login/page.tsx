import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  // Se já estiver logado, redireciona para o painel instantaneamente
  if (session) {
    redirect("/dashboard");
  }

  // Se não estiver logado, renderiza o formulário visual
  return <LoginForm />;
}