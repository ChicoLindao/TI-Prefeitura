"use client";
import { useState, useEffect } from "react";

export default function InfraPage() {
  const [activeTab, setActiveTab] = useState<'printers' | 'routers' | 'ips' | 'remote'>('printers');
  
  const [data, setData] = useState({ printers: [], routers: [], ipRanges: [], remoteAccesses: [], sectors: [] });
  const [searchQuery, setSearchQuery] = useState("");

  const [formPrinter, setFormPrinter] = useState({ model: "", ipAddress: "", sectorId: "", show: false });
  const [formRouter, setFormRouter] = useState({ networkName: "", password: "", sectorId: "", show: false });
  const [formIpRange, setFormIpRange] = useState({ range: "", sectorId: "", show: false });
  const [formIpAddress, setFormIpAddress] = useState({ ip: "", device: "", rangeId: "", show: false });
  const [formRemote, setFormRemote] = useState({ code: "", sectorId: "", patrimony: "", show: false });

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: "", type: "" });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Código AnyDesk copiado!", "success");
  };

  const fetchData = async () => {
    const res = await fetch("/api/infra");
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (actionType: string, payload: any, resetForm: () => void) => {
    const res = await fetch("/api/infra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType, ...payload })
    });
    if (res.ok) {
      resetForm();
      fetchData();
      showToast("Cadastrado com sucesso!", "success");
    } else {
      showToast("Erro ao salvar registro.", "error");
    }
  };

  const confirmDelete = (id: string, type: string) => setDeleteModal({ show: true, id, type });

  const executeDelete = async () => {
    const { id, type } = deleteModal;
    setDeleteModal({ show: false, id: "", type: "" });
    const res = await fetch(`/api/infra?id=${id}&type=${type}`, { method: "DELETE" });
    if (res.ok) {
      fetchData();
      showToast("Registro excluído com sucesso!", "success");
    } else {
      showToast("Erro ao excluir registro.", "error");
    }
  };

  const search = searchQuery.toLowerCase();
  const filteredPrinters = data.printers.filter((p: any) => p.model.toLowerCase().includes(search) || p.ipAddress.toLowerCase().includes(search) || p.sector?.name.toLowerCase().includes(search));
  const filteredRouters = data.routers.filter((r: any) => r.networkName.toLowerCase().includes(search) || r.sector?.name.toLowerCase().includes(search));
  const filteredIps = data.ipRanges.filter((i: any) => i.range.toLowerCase().includes(search) || i.sector?.name.toLowerCase().includes(search));
  
  // Filtra os acessos remotos com a barra de pesquisa
  const filteredRemote = data.remoteAccesses.filter((r: any) => r.code.toLowerCase().includes(search) || r.sector?.name.toLowerCase().includes(search) || r.patrimony.toLowerCase().includes(search));
  
  // MÁGICA DO ACESSO REMOTO: Agrupa os acessos filtrados por nome do Setor
  const groupedRemote = filteredRemote.reduce((acc: any, curr: any) => {
    const sectorName = curr.sector?.name || 'Sem Setor';
    if (!acc[sectorName]) acc[sectorName] = [];
    acc[sectorName].push(curr);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 text-gray-900 dark:text-white relative">
      
      {toast.show && (
        <div className={`fixed top-5 right-5 px-6 py-3 rounded-lg shadow-lg font-bold text-white transition-opacity z-50 animate-bounce ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? '✅ ' : '❌ '}{toast.message}
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold mb-4">Atenção!</h2>
            <p className="mb-8">Tem certeza que deseja apagar este registro permanentemente?</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setDeleteModal({ show: false, id: "", type: "" })} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 rounded font-bold transition">Cancelar</button>
              <button onClick={executeDelete} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition">Excluir</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Informações Úteis</h1>
          <a href="/dashboard" className="text-gray-800 dark:text-gray-400 hover:underline font-medium text-lg">← Voltar ao Painel</a>
        </div>

        <div className="flex flex-wrap space-x-2 border-b border-gray-300 dark:border-gray-700 mb-6">
          <button onClick={() => { setActiveTab('printers'); setSearchQuery(""); }} className={`px-5 py-3 font-bold text-base rounded-t-lg transition ${activeTab === 'printers' ? 'bg-white dark:bg-gray-800 text-blue-600 border-t-4 border-blue-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`}>🖨️ Impressoras</button>
          <button onClick={() => { setActiveTab('routers'); setSearchQuery(""); }} className={`px-5 py-3 font-bold text-base rounded-t-lg transition ${activeTab === 'routers' ? 'bg-white dark:bg-gray-800 text-purple-600 border-t-4 border-purple-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`}>📡 Wi-fi</button>
          <button onClick={() => { setActiveTab('ips'); setSearchQuery(""); }} className={`px-5 py-3 font-bold text-base rounded-t-lg transition ${activeTab === 'ips' ? 'bg-white dark:bg-gray-800 text-green-600 border-t-4 border-green-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`}>🌐 Faixas de IP</button>
          <button onClick={() => { setActiveTab('remote'); setSearchQuery(""); }} className={`px-5 py-3 font-bold text-base rounded-t-lg transition ${activeTab === 'remote' ? 'bg-white dark:bg-gray-800 text-orange-600 border-t-4 border-orange-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`}>💻 Acesso Remoto</button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 min-h-[500px]">
          <input type="text" placeholder="🔍 Pesquisar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full mb-6 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />

          {/* IMPRESSORAS */}
          {activeTab === 'printers' && (
            <div>
              <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                <h2 className="text-xl font-bold">Impressoras</h2>
                <button onClick={() => setFormPrinter({ ...formPrinter, show: !formPrinter.show })} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">{formPrinter.show ? "Cancelar" : "+ Nova"}</button>
              </div>
              {formPrinter.show && (
                <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-lg border dark:border-gray-700 mb-6 flex flex-col sm:flex-row gap-4">
                  <input type="text" placeholder="Modelo" value={formPrinter.model} onChange={e => setFormPrinter({ ...formPrinter, model: e.target.value })} className="flex-1 p-3 rounded border dark:border-gray-600 dark:bg-gray-800" />
                  <input type="text" placeholder="IP" value={formPrinter.ipAddress} onChange={e => setFormPrinter({ ...formPrinter, ipAddress: e.target.value })} className="flex-1 p-3 rounded border dark:border-gray-600 dark:bg-gray-800" />
                  <select value={formPrinter.sectorId} onChange={e => setFormPrinter({ ...formPrinter, sectorId: e.target.value })} className="flex-1 p-3 rounded border dark:border-gray-600 dark:bg-gray-800">
                    <option value="">Selecione o Setor...</option>{data.sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={() => handleCreate("CREATE_PRINTER", formPrinter, () => setFormPrinter({ model: "", ipAddress: "", sectorId: "", show: false }))} className="bg-blue-600 text-white font-bold py-3 px-6 rounded">Salvar</button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredPrinters.map((p: any) => (
                  <div key={p.id} className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                    {/* Alteração: IP no topo e Modelo em baixo */}
                    <h3 className="font-bold text-xl font-mono text-gray-900 dark:text-white">{p.ipAddress}</h3>
                    <p className="text-sm mt-2">Setor: {p.sector?.name}</p>
                    <p className="text-blue-600 dark:text-blue-400 font-bold mt-1">Modelo: {p.model}</p>
                    <button onClick={() => confirmDelete(p.id, 'PRINTER')} className="mt-4 text-red-500 hover:text-red-700 font-bold text-sm">🗑️ Excluir</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROTEADORES */}
          {activeTab === 'routers' && (
            <div>
              <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                <h2 className="text-xl font-bold">Wi-fi</h2>
                <button onClick={() => setFormRouter({ ...formRouter, show: !formRouter.show })} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg">{formRouter.show ? "Cancelar" : "+ Nova"}</button>
              </div>
              {formRouter.show && (
                <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-lg border dark:border-gray-700 mb-6 flex flex-col sm:flex-row gap-4">
                  <input type="text" placeholder="Nome da Rede" value={formRouter.networkName} onChange={e => setFormRouter({ ...formRouter, networkName: e.target.value })} className="flex-1 p-3 rounded border dark:border-gray-600 dark:bg-gray-800" />
                  <input type="text" placeholder="Senha" value={formRouter.password} onChange={e => setFormRouter({ ...formRouter, password: e.target.value })} className="flex-1 p-3 rounded border dark:border-gray-600 dark:bg-gray-800" />
                  <select value={formRouter.sectorId} onChange={e => setFormRouter({ ...formRouter, sectorId: e.target.value })} className="flex-1 p-3 rounded border dark:border-gray-600 dark:bg-gray-800">
                    <option value="">Selecione o Setor...</option>{data.sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={() => handleCreate("CREATE_ROUTER", formRouter, () => setFormRouter({ networkName: "", password: "", sectorId: "", show: false }))} className="bg-purple-600 text-white font-bold py-3 px-6 rounded">Salvar</button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredRouters.map((r: any) => (
                  <div key={r.id} className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-bold text-lg text-purple-500">{r.networkName}</h3>
                    <p className="text-sm mt-1">Setor: {r.sector?.name}</p>
                    <p className="font-mono mt-2 text-sm">Senha: {r.password}</p>
                    <button onClick={() => confirmDelete(r.id, 'ROUTER')} className="mt-4 text-red-500 hover:text-red-700 font-bold text-sm">🗑️ Excluir</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAIXAS DE IP */}
          {activeTab === 'ips' && (
            <div>
              <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                <h2 className="text-xl font-bold">Faixas de IP e IPs em uso</h2>
                <button onClick={() => setFormIpRange({ ...formIpRange, show: !formIpRange.show })} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg">{formIpRange.show ? "Cancelar" : "+ Nova Faixa"}</button>
              </div>
              {formIpRange.show && (
                <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-lg border dark:border-gray-700 mb-6 flex flex-col sm:flex-row gap-4">
                  <input type="text" placeholder="Nome da Faixa (Ex: Faixa 1 - 192.168.0.x)" value={formIpRange.range} onChange={e => setFormIpRange({ ...formIpRange, range: e.target.value })} className="flex-1 p-3 rounded border dark:border-gray-600 dark:bg-gray-800 font-mono" />
                  <select value={formIpRange.sectorId} onChange={e => setFormIpRange({ ...formIpRange, sectorId: e.target.value })} className="flex-1 p-3 rounded border dark:border-gray-600 dark:bg-gray-800">
                    <option value="">Selecione o Setor...</option>{data.sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={() => handleCreate("CREATE_IP_RANGE", formIpRange, () => setFormIpRange({ range: "", sectorId: "", show: false }))} className="bg-green-600 text-white font-bold py-3 px-6 rounded">Salvar Faixa</button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredIps.map((i: any) => {
                  const sortedIps = i.ips ? [...i.ips].sort((a, b) => {
                    const lastNumA = parseInt(a.ip.split('.').pop() || '0', 10);
                    const lastNumB = parseInt(b.ip.split('.').pop() || '0', 10);
                    return lastNumA - lastNumB;
                  }) : [];

                  return (
                    <div key={i.id} className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{i.range}</h3>
                          <p className="text-sm text-gray-500">Setor: {i.sector?.name}</p>
                        </div>
                        <button onClick={() => confirmDelete(i.id, 'IP_RANGE')} className="text-red-500 hover:text-red-700 font-bold text-xs">🗑️ Apagar Faixa</button>
                      </div>

                      <div className="space-y-2 mb-4">
                        {sortedIps.map((ip: any) => (
                          <div key={ip.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 border dark:border-gray-700 rounded text-sm">
                            <span><strong className="text-green-600 font-mono">{ip.ip}</strong> - {ip.device || 'Sem descrição'}</span>
                            <button onClick={() => confirmDelete(ip.id, 'IP_ADDRESS')} className="text-red-500 hover:text-red-700">🗑️</button>
                          </div>
                        ))}
                      </div>

                      {formIpAddress.show && formIpAddress.rangeId === i.id ? (
                        <div className="flex flex-col gap-2 bg-white dark:bg-gray-800 p-3 border dark:border-gray-700 rounded mt-2">
                          <input type="text" placeholder="Ex: 192.168.0.50" value={formIpAddress.ip} onChange={e => setFormIpAddress({ ...formIpAddress, ip: e.target.value })} className="p-2 border rounded dark:border-gray-600 dark:bg-gray-700 font-mono text-sm" />
                          <input type="text" placeholder="Dispositivo (Ex: Servidor 1)" value={formIpAddress.device} onChange={e => setFormIpAddress({ ...formIpAddress, device: e.target.value })} className="p-2 border rounded dark:border-gray-600 dark:bg-gray-700 text-sm" />
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleCreate("CREATE_IP_ADDRESS", formIpAddress, () => setFormIpAddress({ ip: "", device: "", rangeId: "", show: false }))} className="bg-green-600 text-white font-bold py-1 px-3 rounded text-sm flex-1">Salvar IP</button>
                            <button onClick={() => setFormIpAddress({ ip: "", device: "", rangeId: "", show: false })} className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white font-bold py-1 px-3 rounded text-sm">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setFormIpAddress({ ip: "", device: "", rangeId: i.id, show: true })} className="w-full text-sm text-green-600 dark:text-green-400 font-bold py-2 border border-green-200 dark:border-green-800 rounded hover:bg-green-100 dark:hover:bg-gray-800 transition">+ Adicionar IP nesta faixa</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACESSO REMOTO */}
          {activeTab === 'remote' && (
            <div>
              <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                <h2 className="text-xl font-bold">Acesso Remoto (AnyDesk)</h2>
                <button onClick={() => setFormRemote({ ...formRemote, show: !formRemote.show })} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg">{formRemote.show ? "Cancelar" : "+ Novo Acesso"}</button>
              </div>
              {formRemote.show && (
                <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-lg border dark:border-gray-700 mb-6 flex flex-col sm:flex-row gap-4">
                  <input type="text" placeholder="Código (Ex: 1 234 567 890)" value={formRemote.code} onChange={e => setFormRemote({ ...formRemote, code: e.target.value })} className="flex-1 p-3 rounded border dark:border-gray-600 dark:bg-gray-800 font-mono" />
                  <select value={formRemote.sectorId} onChange={e => setFormRemote({ ...formRemote, sectorId: e.target.value })} className="flex-1 p-3 rounded border dark:border-gray-600 dark:bg-gray-800">
                    <option value="">Selecione o Setor...</option>
                    {data.sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="text" placeholder="Patrimônio / Num. Série" value={formRemote.patrimony} onChange={e => setFormRemote({ ...formRemote, patrimony: e.target.value })} className="flex-1 p-3 rounded border dark:border-gray-600 dark:bg-gray-800" />
                  <button onClick={() => handleCreate("CREATE_REMOTE_ACCESS", formRemote, () => setFormRemote({ code: "", sectorId: "", patrimony: "", show: false }))} className="bg-orange-600 text-white font-bold py-3 px-6 rounded">Salvar</button>
                </div>
              )}
              
              {/* Listagem do Acesso Remoto agrupado igual Faixa de IP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(groupedRemote).map(([sectorName, accesses]: [string, any]) => (
                  <div key={sectorName} className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 shadow-sm">
                    <div className="mb-4 border-b dark:border-gray-700 pb-2">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">Setor: {sectorName}</h3>
                    </div>

                    <div className="space-y-2">
                      {accesses.map((r: any) => (
                        <div key={r.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 border dark:border-gray-700 rounded text-sm">
                          <span>
                            <strong className="text-orange-600 font-mono tracking-wider">{r.code}</strong> - {r.patrimony || 'Sem descrição'}
                          </span>
                          <div className="flex items-center gap-3">
                            <button onClick={() => copyToClipboard(r.code)} className="text-gray-400 hover:text-orange-600 transition" title="Copiar Código">📋</button>
                            <button onClick={() => confirmDelete(r.id, 'REMOTE_ACCESS')} className="text-red-500 hover:text-red-700" title="Excluir">🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}