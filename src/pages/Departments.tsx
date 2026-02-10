import React, { useEffect, useState } from 'react';
import { supabase, Department, Contract } from '../lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: deptsData } = await supabase
          .from('departments')
          .select('*')
          .order('name');
        setDepartments(deptsData || []);

        const { data: contractsData } = await supabase.from('contracts').select('*');
        setContracts(contractsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingDept) {
        const { error } = await supabase
          .from('departments')
          .update({ name: form.name, description: form.description })
          .eq('id', editingDept.id);

        if (error) throw error;
        setDepartments(
          departments.map((d) =>
            d.id === editingDept.id ? { ...d, name: form.name, description: form.description } : d
          )
        );
      } else {
        const { error, data } = await supabase
          .from('departments')
          .insert({ name: form.name, description: form.description })
          .select();

        if (error) throw error;
        setDepartments([...departments, data[0]]);
      }

      setForm({ name: '', description: '' });
      setEditingDept(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving department:', error);
      alert('Erro ao salvar departamento');
    }
  };

  const handleDelete = async (id: string) => {
    const deptContracts = contracts.filter((c) => c.department_id === id);
    if (deptContracts.length > 0) {
      alert('Não é possível deletar um departamento com contratos ativos');
      return;
    }

    if (!window.confirm('Tem certeza que deseja deletar este departamento?')) return;

    try {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
      setDepartments(departments.filter((d) => d.id !== id));
    } catch (error) {
      console.error('Error deleting department:', error);
      alert('Erro ao deletar departamento');
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setForm({ name: dept.name, description: dept.description || '' });
    setShowForm(true);
  };

  const getDepartmentContractCount = (deptId: string) => {
    return contracts.filter((c) => c.department_id === deptId).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-4 text-zinc-400">Carregando departamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Departamentos</h2>
          <p className="text-zinc-400 text-sm mt-1">{departments.length} departamento(s)</p>
        </div>
        <button
          onClick={() => {
            setEditingDept(null);
            setForm({ name: '', description: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Novo Departamento
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            {editingDept ? 'Editar Departamento' : 'Novo Departamento'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 text-zinc-400 hover:text-white rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                {editingDept ? 'Atualizar' : 'Criar'} Departamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => {
          const contractCount = getDepartmentContractCount(dept.id);
          return (
            <div key={dept.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{dept.name}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{dept.description || 'Sem descrição'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(dept)}
                    className="p-2 text-amber-500 hover:bg-amber-600/20 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id)}
                    disabled={contractCount > 0}
                    className={`p-2 rounded transition-colors ${
                      contractCount > 0
                        ? 'text-zinc-500 cursor-not-allowed'
                        : 'text-red-500 hover:bg-red-600/20'
                    }`}
                    title={contractCount > 0 ? 'Não pode deletar com contratos' : 'Deletar'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-zinc-800/50 rounded">
                <p className="text-xs text-zinc-400 uppercase font-medium">Contratos</p>
                <p className="text-2xl font-bold text-red-500 mt-1">{contractCount}</p>
              </div>
            </div>
          );
        })}
      </div>

      {departments.length === 0 && (
        <div className="text-center text-zinc-400 py-12">
          <p>Nenhum departamento encontrado</p>
        </div>
      )}
    </div>
  );
};
