import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Contract, AuditQueueItem } from '../lib/supabase';
import { FileText, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, getDaysUntilDeadline } from '../lib/utils';

export const Dashboard: React.FC = () => {
  const { isAdmin, isGestor, user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [auditQueue, setAuditQueue] = useState<AuditQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch contracts
        let contractsQuery = supabase.from('contracts').select('*');

        if (isGestor) {
          contractsQuery = contractsQuery.eq('department_id', user?.department_id);
        } else if (!isAdmin) {
          contractsQuery = contractsQuery.eq('created_by', user?.id);
        }

        const { data: contractsData } = await contractsQuery;
        setContracts(contractsData || []);

        // Fetch audit queue (admin only)
        if (isAdmin) {
          const { data: queueData } = await supabase
            .from('audit_queue')
            .select('*')
            .eq('status', 'Pendente');
          setAuditQueue(queueData || []);
        }

        // Prepare chart data
        if (contractsData) {
          const statuses = {
            'Ativo': 0,
            'Pendente Aprovacao': 0,
            'Encerrado': 0,
            'Rejeitado': 0,
          };

          contractsData.forEach((contract) => {
            statuses[contract.status as keyof typeof statuses]++;
          });

          setChartData([
            { name: 'Ativo', value: statuses['Ativo'] },
            { name: 'Pendente', value: statuses['Pendente Aprovacao'] },
            { name: 'Encerrado', value: statuses['Encerrado'] },
            { name: 'Rejeitado', value: statuses['Rejeitado'] },
          ]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, isGestor, user?.id, user?.department_id]);

  const activeContracts = contracts.filter((c) => c.status === 'Ativo');
  const totalValue = contracts.reduce((sum, c) => sum + c.value_total, 0);
  const expiringIn30Days = contracts.filter(
    (c) => getDaysUntilDeadline(c.end_date, c.aviso_previo) <= 30 && getDaysUntilDeadline(c.end_date, c.aviso_previo) > 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-4 text-zinc-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin && (
          <Link to="/auditoria" className="block">
            <div className="bg-gradient-to-br from-red-600/20 to-red-700/20 border border-red-600/30 rounded-lg p-6 hover:border-red-600 transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-zinc-400 text-sm font-medium">A Analisar</p>
                  <p className="text-3xl font-bold text-red-500 mt-2">{auditQueue.length}</p>
                </div>
                <AlertCircle className="text-red-500" size={24} />
              </div>
            </div>
          </Link>
        )}

        <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-600/30 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-zinc-400 text-sm font-medium">Contratos Ativos</p>
              <p className="text-3xl font-bold text-green-500 mt-2">{activeContracts.length}</p>
            </div>
            <FileText className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-600/30 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-zinc-400 text-sm font-medium">Valor Total</p>
              <p className="text-2xl font-bold text-blue-500 mt-2">{formatCurrency(totalValue)}</p>
            </div>
            <TrendingUp className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-600/30 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-zinc-400 text-sm font-medium">Vencendo em 30d</p>
              <p className="text-3xl font-bold text-orange-500 mt-2">{expiringIn30Days.length}</p>
            </div>
            <Calendar className="text-orange-500" size={24} />
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Distribuição de Contratos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '6px',
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="value" fill="#dc2626" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Contracts */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Contratos Recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Fornecedor</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">CNPJ</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Valor</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {contracts.slice(0, 5).map((contract) => (
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
                        : 'bg-zinc-600/20 text-zinc-400'
                    }`}>
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(contract.end_date).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
