import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, Contract, User } from '../lib/supabase';
import { formatCurrency, formatDate, getDaysUntilDeadline } from '../lib/utils';
import { Download, ArrowLeft, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const ContractDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isGestor } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [approver, setApprover] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const { data: contractData } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (contractData) {
          setContract(contractData);

          if (contractData.approver_id) {
            const { data: approverData } = await supabase
              .from('users')
              .select('*')
              .eq('id', contractData.approver_id)
              .maybeSingle();
            setApprover(approverData);
          }
        }
      } catch (error) {
        console.error('Error fetching contract:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [id]);

  const handleApprove = async () => {
    if (!contract) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'Ativo' })
        .eq('id', contract.id);

      if (error) throw error;
      setContract({ ...contract, status: 'Ativo' });
    } catch (error) {
      console.error('Error approving contract:', error);
      alert('Erro ao aprovar contrato');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!contract) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'Rejeitado', rejection_reason: rejectionReason })
        .eq('id', contract.id);

      if (error) throw error;
      setContract({ ...contract, status: 'Rejeitado', rejection_reason: rejectionReason });
      setShowRejectForm(false);
    } catch (error) {
      console.error('Error rejecting contract:', error);
      alert('Erro ao rejeitar contrato');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja deletar este contrato?')) return;

    try {
      const { error } = await supabase.from('contracts').delete().eq('id', contract?.id);
      if (error) throw error;
      navigate('/contratos');
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Erro ao deletar contrato');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-4 text-zinc-400">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-red-500 hover:text-red-400 mb-4">
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="text-center text-zinc-400">Contrato não encontrado</div>
      </div>
    );
  }

  const daysUntilDeadline = getDaysUntilDeadline(contract.end_date, contract.aviso_previo);
  const isExpiring = daysUntilDeadline <= 30 && daysUntilDeadline > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-red-500 hover:text-red-400 mb-4">
          <ArrowLeft size={20} /> Voltar
        </button>
        <h2 className="text-2xl font-bold text-white">{contract.supplier_name}</h2>
        <p className="text-zinc-400 text-sm mt-1">CNPJ: {contract.cnpj}</p>
      </div>

      {/* Status Bar */}
      <div className={`p-4 rounded-lg border ${
        contract.status === 'Ativo'
          ? 'bg-green-600/20 border-green-600/30'
          : contract.status === 'Pendente Aprovacao'
          ? 'bg-yellow-600/20 border-yellow-600/30'
          : contract.status === 'Rejeitado'
          ? 'bg-red-600/20 border-red-600/30'
          : 'bg-zinc-700/20 border-zinc-700/30'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-300">Status</p>
            <p className={`text-lg font-bold ${
              contract.status === 'Ativo'
                ? 'text-green-500'
                : contract.status === 'Pendente Aprovacao'
                ? 'text-yellow-500'
                : contract.status === 'Rejeitado'
                ? 'text-red-500'
                : 'text-zinc-400'
            }`}>
              {contract.status}
            </p>
          </div>
          {isExpiring && (
            <div className="text-right">
              <p className="text-sm font-medium text-orange-400">Expira em {daysUntilDeadline} dias</p>
            </div>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Informações Básicas</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase text-zinc-400 font-medium">CNPJ</p>
              <p className="text-white mt-1">{contract.cnpj}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-400 font-medium">Razão Social</p>
              <p className="text-white mt-1">{contract.supplier_name}</p>
            </div>
            {contract.nome_fantasia && (
              <div>
                <p className="text-xs uppercase text-zinc-400 font-medium">Nome Fantasia</p>
                <p className="text-white mt-1">{contract.nome_fantasia}</p>
              </div>
            )}
            {contract.endereco && (
              <div>
                <p className="text-xs uppercase text-zinc-400 font-medium">Endereço</p>
                <p className="text-white mt-1">{contract.endereco}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contract Terms */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Termos do Contrato</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase text-zinc-400 font-medium">Valor Total</p>
              <p className="text-white mt-1 text-lg font-bold">{formatCurrency(contract.value_total)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-400 font-medium">Período</p>
              <p className="text-white mt-1">
                {formatDate(contract.start_date)} a {formatDate(contract.end_date)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-400 font-medium">Aviso Prévio</p>
              <p className="text-white mt-1">{contract.aviso_previo} dias</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Linha do Tempo</h3>
        <div className="relative">
          {/* Progress bar */}
          <div className="w-full bg-zinc-800 rounded-full h-3 mb-6">
            <div
              className="bg-gradient-to-r from-red-600 to-orange-600 h-3 rounded-full"
              style={{
                width: `${Math.min(
                  ((new Date().getTime() - new Date(contract.start_date).getTime()) /
                    (new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime())) *
                    100,
                  100
                )}%`,
              }}
            ></div>
          </div>

          {/* Labels */}
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-zinc-400 text-xs uppercase mb-1">Início</p>
              <p className="text-white font-medium">{formatDate(contract.start_date)}</p>
            </div>
            <div className="text-center">
              <p className="text-zinc-400 text-xs uppercase mb-1">Hoje</p>
              <p className="text-white font-medium">{formatDate(new Date())}</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-400 text-xs uppercase mb-1">Fim</p>
              <p className="text-white font-medium">{formatDate(contract.end_date)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        {contract.file_url && (
          <a href={contract.file_url} target="_blank" rel="noopener noreferrer">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Download size={20} />
              Download PDF
            </button>
          </a>
        )}

        {contract.status === 'Pendente Aprovacao' && isGestor && (
          <>
            <button
              onClick={handleApprove}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <CheckCircle size={20} />
              Aprovar
            </button>
            <button
              onClick={() => setShowRejectForm(!showRejectForm)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <XCircle size={20} />
              Rejeitar
            </button>
          </>
        )}

        {isAdmin && (
          <>
            <Link to={`/contratos/${contract.id}/editar`}>
              <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors">
                <Edit2 size={20} />
                Editar
              </button>
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Trash2 size={20} />
              Deletar
            </button>
          </>
        )}
      </div>

      {/* Rejection Form */}
      {showRejectForm && (
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
          <p className="text-red-400 font-medium mb-3">Motivo da rejeição (opcional)</p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 transition-colors mb-3"
            rows={3}
            placeholder="Digite o motivo da rejeição..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={updating}
              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded transition-colors"
            >
              Confirmar Rejeição
            </button>
            <button
              onClick={() => setShowRejectForm(false)}
              className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
