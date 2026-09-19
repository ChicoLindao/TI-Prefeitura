export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import SocketListener from '@/app/components/SocketListener';
import SessionGuard from "@/app/components/SessionGuard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <section>
      {/* O ouvinte fica aqui, escondido, operando em todas as telas do Dashboard! */}
      <SocketListener />
      {/* O vigia de inatividade opera de forma invisível derrubando sessões expiradas */}
      <SessionGuard />
      {children}
    </section>
  );
}