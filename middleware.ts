import { withAuth } from "next-auth/middleware";

export default withAuth;

export const config = {
  matcher: [
    /* PROTEÇÃO DAS TELAS VISUAIS */
    "/dashboard/:path*",

    /* PROTEÇÃO DAS PORTAS DOS FUNDOS (APIs PRIVADAS) */
    "/api/external/:path*",
    "/api/infra/:path*",
    "/api/internal/:path*",
    "/api/profile/:path*",
    "/api/search/:path*",
    "/api/settings/:path*",
    "/api/users/:path*"
  ],
};
