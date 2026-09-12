export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col items-center justify-center w-full">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium animate-pulse">
        Carregando dados...
      </p>
    </div>
  );
}
