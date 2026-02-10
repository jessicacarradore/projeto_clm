import React, { useEffect, useState } from 'react';
import { supabase, User, Department } from '../lib/supabase';
import { Plus, Edit2, Trash2, Mail } from 'lucide-react';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    role: 'Solicitante',
    department_id: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .order('full_name');
        setUsers(usersData || []);

        const { data: deptsData } = await supabase
          .from('departments')
          .select('*')
          .order('name');
        setDepartments(deptsData || []);
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
      if (editingUser) {
        const { error } = await supabase
          .from('users')
          .update({
            full_name: form.full_name,
            role: form.role,
            department_id: form.department_id || null,
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        setUsers(
          users.map((u) =>
            u.id === editingUser.id
              ? { ...u, full_name: form.full_name, role: form.role as any, department_id: form.department_id || null }
              : u
          )
        );
      } else {
        const { error: signUpError, data: authData } = await supabase.auth.signUp({
          email: form.email,
          password: Math.random().toString(36).slice(-12),
        });

        if (signUpError) throw signUpError;

        const { error: dbError } = await supabase.from('users').insert({
          id: authData.user?.id,
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          department_id: form.department_id || null,
        });

        if (dbError) throw dbError;

        setUsers([
          ...users,
          {
            id: authData.user?.id || '',
            email: form.email,
            full_name: form.full_name,
            role: form.role as any,
            department_id: form.department_id || null,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      }

      setForm({ email: '', full_name: '', role: 'Solicitante', department_id: '' });
      setEditingUser(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Erro ao salvar usuário');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      setUsers(users.filter((u) => u.id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erro ao deletar usuário');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department_id: user.department_id || '',
    });
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-4 text-zinc-400">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Usuários</h2>
          <p className="text-zinc-400 text-sm mt-1">{users.length} usuário(s)</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setForm({ email: '', full_name: '', role: 'Solicitante', department_id: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Novo Usuário
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingUser && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Nome Completo *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Função *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
              >
                <option value="Solicitante">Solicitante</option>
                <option value="Gestor de Departamento">Gestor de Departamento</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            </div>

            {form.role !== 'Super Admin' && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Departamento</label>
                <select
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                >
                  <option value="">Nenhum</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                {editingUser ? 'Atualizar' : 'Criar'} Usuário
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-white font-medium mb-1">Nenhum usuário encontrado</p>
            <p className="text-zinc-400 text-sm">Crie um novo usuário para começar</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-800 border-b border-zinc-700">
              <tr>
                <th className="text-left px-4 py-3 text-zinc-300 font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-zinc-300 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-zinc-300 font-medium">Função</th>
                <th className="text-left px-4 py-3 text-zinc-300 font-medium">Departamento</th>
                <th className="text-right px-4 py-3 text-zinc-300 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const dept = departments.find((d) => d.id === user.department_id);
                return (
                  <tr key={user.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 text-white">{user.full_name}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      <a href={`mailto:${user.email}`} className="flex items-center gap-2 hover:text-red-500">
                        <Mail size={14} />
                        {user.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-white text-xs">
                      <span className={`px-2 py-1 rounded ${
                        user.role === 'Super Admin'
                          ? 'bg-red-600/20 text-red-500'
                          : user.role === 'Gestor de Departamento'
                          ? 'bg-orange-600/20 text-orange-500'
                          : 'bg-blue-600/20 text-blue-500'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{dept?.name || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-amber-500 hover:bg-amber-600/20 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-500 hover:bg-red-600/20 rounded transition-colors"
                          title="Deletar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
