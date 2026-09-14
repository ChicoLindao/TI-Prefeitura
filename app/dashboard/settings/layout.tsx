import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Puxa a sessão do usuário direto no servidor
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  // 2. Se não estiver logado ou não for ADMINISTRADOR, chuta de volta pra fora
  if (!user || user.role !== "ADMINISTRADOR") {
    redirect("/dashboard"); 
  }

  // 3. Se for Admin, renderiza a página de configurações normalmente
  return <>{children}</>;
}