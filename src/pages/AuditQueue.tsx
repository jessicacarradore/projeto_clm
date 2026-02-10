import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, AuditQueueItem, Department } from '../lib/supabase';
import { Eye, Check, X, Plus } from 'lucide-react';
import { formatDate } from '../lib/utils';

export const AuditQueue: React.FC = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<AuditQueueItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<AuditQueueItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch departments
        const { data: deptsData } = await supabase
          .from('departments')
          .select('*')
          .order('name');
        setDepartments(deptsData || []);

        // Fetch audit queue
        let query = supabase
          .from('audit_queue')
          .select('*')
          .eq('status', 'Pendente')
          .order('import_date', { ascending: false });

        if (selectedDept) {
          query = query.eq('department_id', selectedDept);
        }

        const { data: queueData } = await query;
        setQueue(queueData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDept]);

  const handleIgnore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('audit_queue')
        .update({ status: 'Ignorado' })
        .eq('id', id);

      if (error) throw error;
      setQueue(queue.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error ignoring item:', error);
    }
  };

  const handleConvert = (item: AuditQueueItem) => {
    navigate('/criar-contrato', { state: { queueItem: item } });
  };

  const total = queue.length;
  const processed = 0;
  const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-4 text-zinc-400">Carregando auditoria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Auditoria KMM</h2>
          <p className="text-zinc-400 text-sm mt-1">Detective - Importação Inteligente</p>
        </div>
        <button
          onClick={() => navigate('/importar')}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Nova Importação
        </button>
      </div>

      {/* Filter */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <label className="block text-sm font-medium text-zinc-300 mb-2">Filtrar por Departamento</label>
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
        >
          <option value="">Todos os Departamentos</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {/* Progress */}
      <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-600/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Progresso da Auditoria</h3>
            <p className="text-zinc-400 text-sm mt-1">{processed} de {total} registros processados</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-red-500">{progress}%</p>
          </div>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-red-600 to-orange-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {queue.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-block p-3 bg-zinc-800 rounded-lg mb-4">
              <Check className="text-green-500" size={32} />
            </div>
            <p className="text-white font-medium mb-1">Nenhum item pendente</p>
            <p className="text-zinc-400 text-sm">Todos os registros foram processados</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-800 border-b border-zinc-700">
              <tr>
                <th className="text-left px-4 py-3 text-zinc-300 font-medium">Fornecedor</th>
                <th className="text-left px-4 py-3 text-zinc-300 font-medium">CNPJ</th>
                <th className="text-left px-4 py-3 text-zinc-300 font-medium">Valor</th>
                <th className="text-left px-4 py-3 text-zinc-300 font-medium">Importado em</th>
                <th className="text-right px-4 py-3 text-zinc-300 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 text-white">
                    {item.source_data?.razao_social || item.source_data?.supplier_name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{item.source_data?.cnpj || 'N/A'}</td>
                  <td className="px-4 py-3 text-white">
                    R$ {parseFloat(item.source_data?.value_total || '0').toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{formatDate(item.import_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setShowDetails(true);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-600/20 rounded transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleConvert(item)}
                        className="p-2 text-green-500 hover:bg-green-600/20 rounded transition-colors"
                        title="Converter em Contrato"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleIgnore(item.id)}
                        className="p-2 text-red-500 hover:bg-red-600/20 rounded transition-colors"
                        title="Ignorar"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Detalhes do Registro</h3>

            <div className="space-y-3">
              {Object.entries(selectedItem.source_data).map(([key, value]) => (
                <div key={key} className="border-b border-zinc-800 pb-2">
                  <p className="text-zinc-400 text-xs uppercase font-medium">{key}</p>
                  <p className="text-white text-sm mt-1">{String(value)}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleConvert(selectedItem)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Converter
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
