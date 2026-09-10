"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Se não estiver montado, retorna null para não dar erro de Hidratação
  if (!mounted) {
    return null; 
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition flex items-center justify-center w-10 h-10"
      title="Alternar Tema"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}