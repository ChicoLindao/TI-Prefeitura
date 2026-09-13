"use client";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-semibold py-2.5 px-4 rounded-xl border border-slate-200 hover:border-red-200 transition-all duration-200 text-sm"
    >
      Sair do Sistema
    </button>
  );
}