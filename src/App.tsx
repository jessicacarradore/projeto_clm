import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AuditQueue } from './pages/AuditQueue';
import { ImportWizard } from './pages/ImportWizard';
import { Contracts } from './pages/Contracts';
import { ContractDetail } from './pages/ContractDetail';
import { CreateContract } from './pages/CreateContract';
import { Users } from './pages/Users';
import { Departments } from './pages/Departments';
import { Settings } from './pages/Settings';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contratos" element={<ProtectedRoute allowedRoles={['Super Admin', 'Gestor de Departamento']}><Contracts /></ProtectedRoute>} />
            <Route path="/contratos/:id" element={<ContractDetail />} />
            <Route path="/contratos/:id/editar" element={<ProtectedRoute allowedRoles={['Super Admin']}><CreateContract /></ProtectedRoute>} />
            <Route path="/criar-contrato" element={<CreateContract />} />
            <Route path="/meus-contratos" element={<ProtectedRoute allowedRoles={['Gestor de Departamento']}><Contracts /></ProtectedRoute>} />
            <Route path="/minhas-solicitacoes" element={<ProtectedRoute allowedRoles={['Solicitante']}><Contracts /></ProtectedRoute>} />
            <Route path="/auditoria" element={<ProtectedRoute allowedRoles={['Super Admin']}><AuditQueue /></ProtectedRoute>} />
            <Route path="/importar" element={<ProtectedRoute allowedRoles={['Super Admin']}><ImportWizard /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute allowedRoles={['Super Admin']}><Users /></ProtectedRoute>} />
            <Route path="/departamentos" element={<ProtectedRoute allowedRoles={['Super Admin']}><Departments /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
