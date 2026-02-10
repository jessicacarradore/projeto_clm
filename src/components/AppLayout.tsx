import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Bell, LogOut } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, role, signOut, isAdmin, isGestor } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCount] = useState(0);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', show: true },
    ...(isAdmin ? [
      { path: '/contratos', label: 'Contratos', show: true },
      { path: '/auditoria', label: 'Auditoria KMM', show: true },
      { path: '/departamentos', label: 'Departamentos', show: true },
      { path: '/usuarios', label: 'Usuários', show: true },
      { path: '/configuracoes', label: 'Configurações', show: true },
    ] : []),
    ...(isGestor ? [
      { path: '/meus-contratos', label: 'Meus Contratos', show: true },
      { path: '/solicitacoes', label: 'Solicitações Pendentes', show: true },
    ] : []),
    ...(!isAdmin && !isGestor ? [
      { path: '/minhas-solicitacoes', label: 'Minhas Solicitações', show: true },
      { path: '/criar-contrato', label: 'Criar Contrato', show: true },
    ] : []),
  ];

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-zinc-950 border-r border-zinc-800 transition-all duration-300 flex flex-col fixed h-screen z-40`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-zinc-800">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/image.png" alt="Pizzatto" className="h-10 w-auto" />
            {sidebarOpen && (
              <span className="font-bold text-white text-sm">Pizzatto Hub</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {menuItems
            .filter((item) => item.show)
            .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-red-600/20 text-red-500 border border-red-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <span className="text-xl">•</span>
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </Link>
            ))}
        </nav>

        {/* Toggle Button */}
        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full px-3 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors flex items-center justify-center"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 flex flex-col`}>
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {menuItems.find((item) => isActive(item.path))?.label || 'Dashboard'}
            </h2>
            <p className="text-sm text-zinc-400">
              {role === 'Super Admin' && 'Administrador do Sistema'}
              {role === 'Gestor de Departamento' && 'Gestor de Departamento'}
              {role === 'Solicitante' && 'Solicitante'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>
              )}
            </button>

            <div className="h-10 w-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user?.full_name.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex flex-col">
              <p className="text-sm font-medium text-white">{user?.full_name}</p>
              <p className="text-xs text-zinc-400">{user?.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-800 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
