export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
      {/* Círculo girando */}
      <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      
      {/* Texto */}
      <p className="text-slate-500 font-medium animate-pulse">
        Carregando dados...
      </p>
    </div>
  );
}