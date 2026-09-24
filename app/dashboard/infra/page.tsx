"use client";
import { useState, useEffect } from "react";

export default function InfraPage() {
  const [activeTab, setActiveTab] = useState<'printers' | 'routers' | 'ips' | 'remote'>('printers');
  
  const [data, setData] = useState({ printers: [], routers: [], ipRanges: [], remoteAccesses: [], sectors: [] });
  const [searchQuery, setSearchQuery] = useState("");

  const [formPrinter, setFormPrinter] = useState({ id: "", model: "", ipAddress: "", sectorId: "", show: false });
  const [formRouter, setFormRouter] = useState({ id: "", networkName: "", password: "", sectorId: "", show: false });
  const [formIpRange, setFormIpRange] = useState({ id: "", range: "", sectorId: "", show: false });
  const [formIpAddress, setFormIpAddress] = useState({ id: "", ip: "", device: "", rangeId: "", show: false });
  const [formRemote, setFormRemote] = useState({ id: "", code: "", sectorId: "", patrimony: "", show: false });

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: "", type: "" });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Código copiado!", "success");
  };

  const fetchData = async () => {
    const res = await fetch("/api/infra");
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (actionType: string, payload: any, resetForm: () => void) => {
    const isEdit = !!payload.id;
    const finalAction = isEdit ? actionType.replace("CREATE", "UPDATE") : actionType;
    
    const res = await fetch("/api/infra", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType: finalAction, ...payload })
    });
    
    if (res.ok) {
      resetForm();
      fetchData();
      showToast(isEdit ? "Atualizado com sucesso!" : "Cadastrado com sucesso!", "success");
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
  const filteredRemote = data.remoteAccesses.filter((r: any) => r.code.toLowerCase().includes(search) || r.sector?.name.toLowerCase().includes(search) || r.patrimony.toLowerCase().includes(search));
  
  const groupedRemote = filteredRemote.reduce((acc: any, curr: any) => {
    const sectorName = curr.sector?.name || 'Sem Setor';
    if (!acc[sectorName]) acc[sectorName] = [];
    acc[sectorName].push(curr);
    return acc;
  }, {});

  const tabs = [
    { key: 'printers', label: 'Impressoras', icon: '🖨️', color: 'blue' },
    { key: 'routers', label: 'Wi-fi', icon: '📡', color: 'cyan' },
    { key: 'ips', label: 'Faixas de IP', icon: '🌐', color: 'emerald' },
    { key: 'remote', label: 'Acesso Remoto', icon: '💻', color: 'orange' },
  ] as const;

  const tabColorMap: Record<string, { active: string; inactive: string; btn: string; accent: string; ring: string }> = {
    blue: { active: "text-blue-600 border-blue-600 bg-blue-50/50", inactive: "text-slate-400 hover:text-slate-600 hover:bg-slate-50", btn: "bg-blue-600 hover:bg-blue-700", accent: "text-blue-600", ring: "focus:ring-blue-500" },
    cyan: { active: "text-cyan-600 border-cyan-600 bg-cyan-50/50", inactive: "text-slate-400 hover:text-slate-600 hover:bg-slate-50", btn: "bg-cyan-600 hover:bg-cyan-700", accent: "text-cyan-600", ring: "focus:ring-cyan-500" },
    emerald: { active: "text-emerald-600 border-emerald-600 bg-emerald-50/50", inactive: "text-slate-400 hover:text-slate-600 hover:bg-slate-50", btn: "bg-emerald-600 hover:bg-emerald-700", accent: "text-emerald-600", ring: "focus:ring-emerald-500" },
    orange: { active: "text-orange-600 border-orange-600 bg-orange-50/50", inactive: "text-slate-400 hover:text-slate-600 hover:bg-slate-50", btn: "bg-orange-600 hover:bg-orange-700", accent: "text-orange-600", ring: "focus:ring-orange-500" },
  };

  const currentTab = tabs.find(t => t.key === activeTab)!;
  const colors = tabColorMap[currentTab.color];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-6 sm:p-8 text-slate-800 relative">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-semibold transition-all duration-300 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <span className="text-xl">{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.message}
        </div>
      )}

      {/* MODAL PADRÃO DE EXCLUSÃO */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Excluir registro</h2>
            <p className="text-slate-500 mb-8 text-sm">Tem certeza que deseja apagar este registro permanentemente? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteModal({ show: false, id: "", type: "" })} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-all text-sm">
                Cancelar
              </button>
              <button onClick={executeDelete} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all text-sm shadow-sm hover:shadow-md">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold mb-1">Infraestrutura</p>
            <h1 className="text-3xl font-bold text-slate-800">Informações Úteis</h1>
          </div>
          <a href="/dashboard" className="text-slate-500 hover:text-slate-700 hover:underline font-medium text-sm transition-colors">← Voltar ao Painel</a>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-slate-200 mb-6">
          {tabs.map(tab => {
            const c = tabColorMap[tab.color];
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSearchQuery(""); }}
                className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all duration-200 ${activeTab === tab.key ? c.active : c.inactive + " border-transparent"}`}
              >
                {tab.icon} {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 min-h-[500px]">
          
          {/* Search */}
          <div className="relative mb-6">
            <input type="text" placeholder="Pesquisar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-slate-700 placeholder-slate-400 focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`} />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          </div>

          {/* PRINTERS */}
          {activeTab === 'printers' && (
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-800">Impressoras</h2>
                <button onClick={() => setFormPrinter({ id: "", model: "", ipAddress: "", sectorId: "", show: !formPrinter.show })} className={`${colors.btn} text-white font-semibold py-2 px-5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm`}>
                  {formPrinter.show ? "Cancelar" : "+ Nova"}
                </button>
              </div>
              {formPrinter.show && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 mb-6 flex flex-col sm:flex-row gap-3">
                  <input type="text" placeholder="Modelo da Impressora" value={formPrinter.model} onChange={e => setFormPrinter({ ...formPrinter, model: e.target.value })} className={`flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`} />
                  <input type="text" placeholder="Endereço IP" value={formPrinter.ipAddress} onChange={e => setFormPrinter({ ...formPrinter, ipAddress: e.target.value })} className={`flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 font-mono focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`} />
                  <select value={formPrinter.sectorId} onChange={e => setFormPrinter({ ...formPrinter, sectorId: e.target.value })} className={`flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`}>
                    <option value="">Selecione o Setor...</option>
                    {data.sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={() => handleSave("CREATE_PRINTER", formPrinter, () => setFormPrinter({ id: "", model: "", ipAddress: "", sectorId: "", show: false }))} className={`${colors.btn} text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm text-sm`}>
                    {formPrinter.id ? "Atualizar" : "Salvar"}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredPrinters.length === 0 && <p className="text-slate-400 italic col-span-full">Nenhuma impressora cadastrada.</p>}
                {filteredPrinters.map((p: any) => (
                  <div key={p.id} className="border border-slate-200 p-4 rounded-xl bg-slate-50 transition-all duration-200 hover:shadow-md hover:border-blue-200 group">
                    <h3 className="font-bold text-lg font-mono text-slate-800">{p.ipAddress}</h3>
                    <p className="text-sm text-slate-500 mt-2">Setor: {p.sector?.name}</p>
                    <p className="text-blue-600 font-semibold mt-1 text-sm">Modelo: {p.model}</p>
                    <div className="mt-4 flex gap-3">
                      <button onClick={() => { setFormPrinter({ id: p.id, model: p.model, ipAddress: p.ipAddress, sectorId: p.sectorId, show: true }); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-blue-600 hover:text-blue-800 font-semibold text-xs transition-colors hover:underline">Editar</button>
                      <button onClick={() => confirmDelete(p.id, 'PRINTER')} className="text-red-500 hover:text-red-700 font-semibold text-xs transition-colors hover:underline">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROUTERS */}
          {activeTab === 'routers' && (
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-800">Wi-fi</h2>
                <button onClick={() => setFormRouter({ id: "", networkName: "", password: "", sectorId: "", show: !formRouter.show })} className={`${colors.btn} text-white font-semibold py-2 px-5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm`}>
                  {formRouter.show ? "Cancelar" : "+ Nova"}
                </button>
              </div>
              {formRouter.show && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 mb-6 flex flex-col sm:flex-row gap-3">
                  <input type="text" placeholder="Nome da Rede" value={formRouter.networkName} onChange={e => setFormRouter({ ...formRouter, networkName: e.target.value })} className={`flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`} />
                  <input type="text" placeholder="Senha" value={formRouter.password} onChange={e => setFormRouter({ ...formRouter, password: e.target.value })} className={`flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 font-mono focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`} />
                  <select value={formRouter.sectorId} onChange={e => setFormRouter({ ...formRouter, sectorId: e.target.value })} className={`flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`}>
                    <option value="">Selecione o Setor...</option>
                    {data.sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={() => handleSave("CREATE_ROUTER", formRouter, () => setFormRouter({ id: "", networkName: "", password: "", sectorId: "", show: false }))} className={`${colors.btn} text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm text-sm`}>
                    {formRouter.id ? "Atualizar" : "Salvar"}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredRouters.length === 0 && <p className="text-slate-400 italic col-span-full">Nenhuma rede cadastrada.</p>}
                {filteredRouters.map((r: any) => (
                  <div key={r.id} className="border border-slate-200 p-4 rounded-xl bg-slate-50 transition-all duration-200 hover:shadow-md hover:border-violet-200 group">
                    <h3 className="font-bold text-lg text-violet-600">{r.networkName}</h3>
                    <p className="text-sm text-slate-500 mt-1">Setor: {r.sector?.name}</p>
                    <p className="font-mono mt-2 text-sm text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg inline-block">Senha: {r.password}</p>
                    <div className="mt-4 flex gap-3">
                      <button onClick={() => { setFormRouter({ id: r.id, networkName: r.networkName, password: r.password, sectorId: r.sectorId, show: true }); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-cyan-600 hover:text-cyan-800 font-semibold text-xs transition-colors hover:underline">Editar</button>
                      <button onClick={() => confirmDelete(r.id, 'ROUTER')} className="text-red-500 hover:text-red-700 font-semibold text-xs transition-colors hover:underline">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IP RANGES */}
          {activeTab === 'ips' && (
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-800">Faixas de IP e IPs em uso</h2>
                <button onClick={() => setFormIpRange({ id: "", range: "", sectorId: "", show: !formIpRange.show })} className={`${colors.btn} text-white font-semibold py-2 px-5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm`}>
                  {formIpRange.show ? "Cancelar" : "+ Nova Faixa"}
                </button>
              </div>
              {formIpRange.show && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 mb-6 flex flex-col sm:flex-row gap-3">
                  <input type="text" placeholder="Nome da Faixa (Ex: Faixa 1 - 192.168.0.x)" value={formIpRange.range} onChange={e => setFormIpRange({ ...formIpRange, range: e.target.value })} className={`flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 font-mono focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`} />
                  <select value={formIpRange.sectorId} onChange={e => setFormIpRange({ ...formIpRange, sectorId: e.target.value })} className={`flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`}>
                    <option value="">Selecione o Setor...</option>
                    {data.sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={() => handleSave("CREATE_IP_RANGE", formIpRange, () => setFormIpRange({ id: "", range: "", sectorId: "", show: false }))} className={`${colors.btn} text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm text-sm`}>
                    {formIpRange.id ? "Atualizar Faixa" : "Salvar Faixa"}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredIps.length === 0 && <p className="text-slate-400 italic col-span-full">Nenhuma faixa de IP cadastrada.</p>}
                {filteredIps.map((i: any) => {
                  const sortedIps = i.ips ? [...i.ips].sort((a, b) => {
                    const lastNumA = parseInt(a.ip.split('.').pop() || '0', 10);
                    const lastNumB = parseInt(b.ip.split('.').pop() || '0', 10);
                    return lastNumA - lastNumB;
                  }) : [];

                  return (
                    <div key={i.id} className="border border-slate-200 p-5 rounded-xl bg-slate-50 transition-all duration-200 hover:shadow-md hover:border-emerald-200">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">{i.range}</h3>
                          <p className="text-sm text-slate-400">Setor: {i.sector?.name}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setFormIpRange({ id: i.id, range: i.range, sectorId: i.sectorId, show: true }); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-emerald-600 hover:text-emerald-800 font-semibold text-xs transition-colors hover:underline">Editar Faixa</button>
                          <button onClick={() => confirmDelete(i.id, 'IP_RANGE')} className="text-red-500 hover:text-red-700 font-semibold text-xs transition-colors hover:underline">Apagar Faixa</button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {sortedIps.length === 0 && <p className="text-xs text-slate-400 italic">Nenhum IP cadastrado nesta faixa.</p>}
                        {sortedIps.map((ip: any) => (
                          <div key={ip.id} className="flex justify-between items-center bg-white p-2.5 border border-slate-200 rounded-lg text-sm">
                            <span><strong className="text-emerald-600 font-mono">{ip.ip}</strong> - {ip.device || 'Sem descrição'}</span>
                            <div className="flex gap-2">
                              <button onClick={() => setFormIpAddress({ id: ip.id, ip: ip.ip, device: ip.device, rangeId: i.id, show: true })} className="text-emerald-600 hover:text-emerald-800 transition-colors" title="Editar">✏️</button>
                              <button onClick={() => confirmDelete(ip.id, 'IP_ADDRESS')} className="text-red-500 hover:text-red-700 transition-colors" title="Excluir">✕</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {formIpAddress.show && formIpAddress.rangeId === i.id ? (
                        <div className="flex flex-col gap-2 bg-white p-4 border border-slate-200 rounded-xl mt-2 shadow-sm">
                          <input type="text" placeholder="Ex: 192.168.0.50" value={formIpAddress.ip} onChange={e => setFormIpAddress({ ...formIpAddress, ip: e.target.value })} className={`p-2.5 border border-slate-200 rounded-lg font-mono text-sm placeholder-slate-400 focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`} />
                          <input type="text" placeholder="Dispositivo (Ex: Servidor 1)" value={formIpAddress.device} onChange={e => setFormIpAddress({ ...formIpAddress, device: e.target.value })} className={`p-2.5 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`} />
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleSave("CREATE_IP_ADDRESS", formIpAddress, () => setFormIpAddress({ id: "", ip: "", device: "", rangeId: "", show: false }))} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-lg text-sm flex-1 transition-all">
                              {formIpAddress.id ? "Atualizar IP" : "Salvar IP"}
                            </button>
                            <button onClick={() => setFormIpAddress({ id: "", ip: "", device: "", rangeId: "", show: false })} className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold py-2 px-3 rounded-lg text-sm transition-all">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setFormIpAddress({ id: "", ip: "", device: "", rangeId: i.id, show: true })} className="w-full text-sm text-emerald-600 font-semibold py-2 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-all duration-200">
                          + Adicionar IP nesta faixa
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* REMOTE ACCESS */}
          {activeTab === 'remote' && (
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-800">Acesso Remoto (AnyDesk)</h2>
                <button onClick={() => setFormRemote({ id: "", code: "", sectorId: "", patrimony: "", show: !formRemote.show })} className={`${colors.btn} text-white font-semibold py-2 px-5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm`}>
                  {formRemote.show ? "Cancelar" : "+ Novo Acesso"}
                </button>
              </div>
              {formRemote.show && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 mb-6 flex flex-col sm:flex-row gap-3">
                  <input type="text" placeholder="Código (Ex: 1 234 567 890)" value={formRemote.code} onChange={e => setFormRemote({ ...formRemote, code: e.target.value })} className={`flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 font-mono focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`} />
                  <select value={formRemote.sectorId} onChange={e => setFormRemote({ ...formRemote, sectorId: e.target.value })} className={`flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`}>
                    <option value="">Selecione o Setor...</option>
                    {data.sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="text" placeholder="Patrimônio / Num. Série" value={formRemote.patrimony} onChange={e => setFormRemote({ ...formRemote, patrimony: e.target.value })} className={`flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 focus:ring-2 ${colors.ring} focus:border-transparent focus:outline-none transition-all`} />
                  <button onClick={() => handleSave("CREATE_REMOTE_ACCESS", formRemote, () => setFormRemote({ id: "", code: "", sectorId: "", patrimony: "", show: false }))} className={`${colors.btn} text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm text-sm`}>
                    {formRemote.id ? "Atualizar" : "Salvar"}
                  </button>
                </div>
              )}
              
              {Object.keys(groupedRemote).length === 0 && <p className="text-slate-400 italic">Nenhum acesso remoto cadastrado.</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(groupedRemote).map(([sectorName, accesses]: [string, any]) => (
                  <div key={sectorName} className="border border-slate-200 p-5 rounded-xl bg-slate-50 transition-all duration-200 hover:shadow-md hover:border-orange-200">
                    <div className="mb-4 border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-lg text-slate-800">Setor: {sectorName}</h3>
                    </div>

                    <div className="space-y-2">
                      {accesses.map((r: any) => (
                        <div key={r.id} className="flex justify-between items-center bg-white p-2.5 border border-slate-200 rounded-lg text-sm">
                          <span>
                            <strong className="text-orange-600 font-mono tracking-wider">{r.code}</strong> - {r.patrimony || 'Sem descrição'}
                          </span>
                          <div className="flex items-center gap-3">
                            <button onClick={() => copyToClipboard(r.code)} className="text-slate-400 hover:text-orange-600 transition-colors text-xs" title="Copiar Código">📋</button>
                            <button onClick={() => { setFormRemote({ id: r.id, code: r.code, patrimony: r.patrimony, sectorId: r.sectorId, show: true }); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-orange-600 hover:text-orange-800 transition-colors text-xs" title="Editar">✏️</button>
                            <button onClick={() => confirmDelete(r.id, 'REMOTE_ACCESS')} className="text-red-500 hover:text-red-700 transition-colors text-xs" title="Excluir">✕</button>
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