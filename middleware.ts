export { default } from "next-auth/middleware";

// Aqui nós definimos quais rotas o "cão de guarda" vai proteger
export const config = {
  matcher: [
    /*
     * Protege todas as rotas que começam com /dashboard
     * O /:path* significa "e qualquer coisa que vier depois", 
     * como /dashboard/internal, /dashboard/settings, etc.
     */
    "/dashboard/:path*"
  ],
};