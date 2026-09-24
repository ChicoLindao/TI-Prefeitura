"use client";

import { useEffect, useState } from "react";

interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = (query = "") => {
    const url = query ? `/api/audit?search=${encodeURIComponent(query)}` : "/api/audit";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setLogs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();

    // Listener para o WebSocket atualizar a tabela automaticamente
    const handleWsUpdate = () => fetchLogs(searchTerm);
    window.addEventListener("atualiza-dados", handleWsUpdate);
    return () => window.removeEventListener("atualiza-dados", handleWsUpdate);
  }, [searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchLogs(searchTerm);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h3 className="text-lg font-semibold text-gray-800">📜 Logs de Auditoria</h3>
        
        {/* BARRA DE PESQUISA */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Pesquisar logs (E-mail, IP, Ação...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          />
          <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-lg font-semibold hover:bg-slate-700 transition-colors text-sm">
            Buscar
          </button>
          {searchTerm && (
            <button type="button" onClick={() => { setSearchTerm(""); fetchLogs(""); }} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg font-semibold hover:bg-slate-200 transition-colors text-sm">
              Limpar
            </button>
          )}
        </form>
      </div>

      <div className="overflow-x-auto h-[400px] overflow-y-auto">
        {loading ? (
          <p className="text-gray-500 text-sm p-4">Carregando logs...</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-600 sticky top-0 shadow-sm">
              <tr>
                <th className="p-3">Data/Hora</th>
                <th className="p-3">Usuário</th>
                <th className="p-3">Ação</th>
                <th className="p-3">Módulo</th>
                <th className="p-3">Detalhes</th>
                <th className="p-3">IP Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">Nenhum registro encontrado para esta pesquisa.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 whitespace-nowrap text-gray-500">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-3 font-medium text-gray-700">{log.userEmail}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        log.action === 'DELETAR' ? 'bg-red-100 text-red-700' :
                        log.action === 'CRIAR' ? 'bg-green-100 text-green-700' :
                        log.action === 'ATUALIZAR' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600 whitespace-nowrap">{log.resource}</td>
                    <td className="p-3 text-gray-600 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="p-3 text-gray-500 font-mono text-xs whitespace-nowrap">{log.ipAddress || 'Desconhecido'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}