"use client"; // Isso avisa ao Next.js que este botão roda no navegador do usuário

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded font-bold shadow print:hidden"
    >
      Imprimir OS
    </button>
  );
}