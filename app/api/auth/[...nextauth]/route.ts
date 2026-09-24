import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { triggerUpdate } from "@/lib/ws"; 

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) return null;

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        });

        try {
          await triggerUpdate('nova-demanda', { tipo: 'LOGIN', setor: user.name });
        } catch (error) {}

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.email = user.email;
        token.loginTime = Date.now(); 
      }
      
      // 🔥 PROTEÇÃO 1: Se o cookie for antigo e não tiver loginTime, criamos um agora para não dar erro (NaN)
      if (!token.loginTime) {
        token.loginTime = Date.now();
      }
      
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { forceLogoutAt: true }
          });

          if (dbUser?.forceLogoutAt) {
            const forceLogoutTime = dbUser.forceLogoutAt.getTime();
            if ((token.loginTime as number) < forceLogoutTime) {
              // 🔥 PROTEÇÃO 2: NUNCA dar "throw new Error" aqui, senão o middleware entra em loop!
              // Em vez disso, apenas marcamos o token com uma flag de erro.
              token.error = "ForceLogout";
            }
          }
        } catch (e) { console.error(e); }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        
        // Passa a flag de erro para o Frontend (SessionGuard) conseguir ler
        if (token.error) {
          (session as any).error = token.error;
        }
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
    maxAge: 6 * 60 * 60, // O próprio NextAuth já controla as 6 Horas aqui
    updateAge: 0, 
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };