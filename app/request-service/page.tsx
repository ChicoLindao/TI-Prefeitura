"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function NovoChamado() {
  const [sectors, setSectors] = useState([]);
  
  const [sectorId, setSectorId] = useState("");
  const [personAttended, setPersonAttended] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [description, setDescription] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // 🔥 CORRIGIDO: Agora puxa os setores da rota blindada (que filtra os inativos)
    fetch("/api/request-service")
      .then(res => res.json())
      .then(data => {
        setSectors(data); // A rota retorna a lista direta, sem o ".sectors"
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(""); 
    
    try {
      // 🔥 CORRIGIDO: Agora envia os dados para a rota que tem E-mail e Anti-Spam
      const res = await fetch("/api/request-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId, personAttended, userEmail, description })
      });
      
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Ocorreu um erro ao enviar a solicitação. Tente novamente.");
      }
    } catch (err) {
      setErrorMessage("Erro de conexão com o servidor.");
    }
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex justify-center w-full mb-8">
          <Image
            src="/logo.png"
            alt="Logo da Prefeitura"
            width={140}
            height={140}
            className="object-contain"
            priority
          />
        </div>

        <div className="bg-white p-10 rounded-2xl shadow-lg max-w-md w-full text-center border border-slate-200">
          <div className="w-16 h-16 mx-auto mb-5 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Atendimento Solicitado!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">Sua solicitação foi salva com sucesso. Nossa equipe entrará em contato ou irá até o setor em breve.</p>
          <Link href="/" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 inline-block shadow-sm hover:shadow-md text-sm">
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 py-12 px-4">
      <div className="flex justify-center w-full mb-8">
        <Link href="/" className="hover:opacity-90 transition-opacity duration-300">
          <Image
            src="/logo.png"
            alt="Logo da Prefeitura"
            width={140}
            height={140}
            className="object-contain"
            priority
          />
        </Link>
      </div>

      <div className="max-w-2xl mx-auto bg-white p-8 sm:p-10 rounded-2xl shadow-lg border border-slate-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Solicitar Atendimento</h1>
            <p className="text-sm text-slate-400 mt-1">Preencha o formulário abaixo</p>
          </div>
          <Link href="/" className="text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors duration-200 flex items-center gap-1">
            <span>←</span> Cancelar
          </Link>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm border border-blue-100 flex items-start gap-3">
            <span className="text-base leading-relaxed">ℹ️</span>
            <span>Preencha os dados abaixo para solicitar um atendimento no seu setor.</span>
          </div>

          {errorMessage && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200 flex items-start gap-3 animate-pulse">
              <span className="text-base leading-relaxed">⚠️</span>
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Seu Nome</label>
              <input 
                required 
                type="text" 
                value={personAttended} 
                onChange={e => setPersonAttended(e.target.value)} 
                className="w-full border border-slate-200 p-3 rounded-xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                placeholder="Ex: João da Silva" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail para Contato</label>
              <input 
                required 
                type="email" 
                value={userEmail} 
                onChange={e => setUserEmail(e.target.value)} 
                className="w-full border border-slate-200 p-3 rounded-xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                placeholder="Ex: joao@prefeitura.gov.br" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Qual o seu Setor?</label>
            <select 
              required 
              value={sectorId} 
              onChange={e => setSectorId(e.target.value)} 
              className="w-full border border-slate-200 p-3 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
            >
              <option value="">Selecione um setor...</option>
              {sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descreva o Problema</label>
            <textarea 
              required 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full border border-slate-200 p-3 rounded-xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none" 
              rows={4} 
              placeholder="Ex: A impressora parou de funcionar, o computador não liga, etc..."
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 text-white px-4 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed text-base"
          >
            {loading ? "Registrando..." : "Solicitar Atendimento"}
          </button>
        </form>
      </div>
    </div>
  );
}