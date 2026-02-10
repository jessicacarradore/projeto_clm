import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Contract, Department } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Eye, Edit2, Trash2 } from 'lucide-react';

export const Contracts: React.FC = () => {
  const { user, isAdmin, isGestor } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch departments
        const { data: deptsData } = await supabase
          .from('departments')
          .select('*')
          .order('name');
        setDepartments(deptsData || []);

        // Fetch contracts
        let query = supabase.from('contracts').select('*');

        if (isGestor) {
          query = query.eq('department_id', user?.department_id);
        } else if (!isAdmin) {
          query = query.eq('created_by', user?.id);
        }

        if (selectedDept) {
          query = query.eq('department_id', selectedDept);
        }

        if (selectedStatus) {
          query = query.eq('status', selectedStatus);
        }

        const { data: contractsData } = await query.order('created_at', { ascending: false });
        setContracts(contractsData || []);
      } catch (error) {
        console.error('Error fetching contracts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, isGestor, user?.id, user?.department_id, selectedDept, selectedStatus]);

  const filteredContracts = contracts.filter((c) =>
    c.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj.includes(searchTerm)
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este contrato?')) return;

    try {
      const { error } = await supabase.from('contracts').delete().eq('id', id);
      if (error) throw error;
      setContracts(contracts.filter((c) => c.id !== id));
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
          <p className="mt-4 text-zinc-400">Carregando contratos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Contratos</h2>
          <p className="text-zinc-400 text-sm mt-1">{filteredContracts.length} contrato(s)</p>
        </div>
        {isAdmin && (
          <Link to="/criar-contrato">
            <button className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
              <Plus size={20} />
              Novo Contrato
            </button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Buscar por fornecedor ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 transition-colors"
          />

          {isAdmin && (
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
            >
              <option value="">Todos os Departamentos</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
          >
            <option value="">Todos os Status</option>
            <option value="Pendente Aprovacao">Pendente Aprovação</option>
            <option value="Ativo">Ativo</option>
            <option value="Encerrado">Encerrado</option>
            <option value="Rejeitado">Rejeitado</option>
          </select>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {filteredContracts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-white font-medium mb-1">Nenhum contrato encontrado</p>
            <p className="text-zinc-400 text-sm">Crie um novo contrato para começar</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-800 border-b border-zinc-700">
              <tr>
                <th className="text-left px-4 py-3 text-zinc-300 font-medium">Fornecedor</th>
                <th className="text-left px-4 py-3 text-zinc-300 font-medium">CNPJ</th>
                <th className="text-left px-4 py-3 text-zinc-300 font-medium">Valor</th>
                <th className="text-left px-4 py-3 text-zinc-300 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-zinc-300 font-medium">Vencimento</th>
                <th className="text-right px-4 py-3 text-zinc-300 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 text-white">{contract.supplier_name}</td>
                  <td className="px-4 py-3 text-zinc-400">{contract.cnpj}</td>
                  <td className="px-4 py-3 text-white">{formatCurrency(contract.value_total)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      contract.status === 'Ativo'
                        ? 'bg-green-600/20 text-green-500'
                        : contract.status === 'Pendente Aprovacao'
                        ? 'bg-yellow-600/20 text-yellow-500'
                        : contract.status === 'Rejeitado'
                        ? 'bg-red-600/20 text-red-500'
                        : 'bg-zinc-600/20 text-zinc-400'
                    }`}>
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{formatDate(contract.end_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/contratos/${contract.id}`}>
                        <button className="p-2 text-blue-500 hover:bg-blue-600/20 rounded transition-colors" title="Ver">
                          <Eye size={16} />
                        </button>
                      </Link>

                      {isAdmin && (
                        <>
                          <Link to={`/contratos/${contract.id}/editar`}>
                            <button className="p-2 text-amber-500 hover:bg-amber-600/20 rounded transition-colors" title="Editar">
                              <Edit2 size={16} />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDelete(contract.id)}
                            className="p-2 text-red-500 hover:bg-red-600/20 rounded transition-colors"
                            title="Deletar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
