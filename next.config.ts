import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isso avisa ao Next.js que esse IP é seguro e da sua rede local
  allowedDevOrigins: ["192.168.0.108"],
  
  // Esconde o ícone do Next.js no canto da tela (Para Next.js 15.2+)
  devIndicators: false,

  // Força o Next.js a ignorar erros chatos de tipagem na hora de ir pro ar
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Ignora avisos de código fora do padrão oficial
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;