/*
  # Pizzatto Hub CLM & Audit Intelligence System - Initial Schema

  1. New Tables
    - `departments` - Organization departments for access control
    - `users` - Application users with role-based access
    - `contracts` - Contract lifecycle management records
    - `audit_queue` - Imported data awaiting processing
    - `notifications` - System alerts for contract reminders
    - `notification_settings` - User notification preferences

  2. Security
    - Enable RLS on all tables
    - Super Admin can access all data globally
    - Gestor de Departamento restricted to their department
    - Solicitante can only see their own records
    - Automatic audit trail with created_by and updated_at

  3. Indexes
    - Department and status filters
    - User authentication and role lookups
    - Contract dates for reminder calculations
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table with role-based access control
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('Super Admin', 'Gestor de Departamento', 'Solicitante')),
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  cnpj text NOT NULL,
  nome_fantasia text,
  endereco text,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'Pendente Aprovacao' CHECK (status IN ('Pendente Aprovacao', 'Ativo', 'Encerrado', 'Rejeitado')),
  value_total numeric NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  aviso_previo integer DEFAULT 30,
  file_url text,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  approver_id uuid REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date > start_date)
);

-- Create audit_queue table
CREATE TABLE IF NOT EXISTS audit_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Ignorado', 'Convertido')),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  imported_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  import_date timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  processing_notes text
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('contract_reminder_90', 'contract_reminder_60', 'contract_reminder_30')),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  message text NOT NULL,
  email_sent boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  reminder_days integer[] DEFAULT ARRAY[90, 60, 30],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments (Super Admin only)
CREATE POLICY "Super Admin can view all departments"
  ON departments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

CREATE POLICY "Super Admin can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

-- RLS Policies for users (Super Admin management)
CREATE POLICY "Super Admin can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super Admin can manage users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

-- RLS Policies for contracts
CREATE POLICY "Super Admin can view all contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

CREATE POLICY "Gestor sees own department contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Gestor de Departamento'
      AND users.department_id = contracts.department_id
    )
  );

CREATE POLICY "Solicitante sees own contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

CREATE POLICY "Authenticated users can insert contracts"
  ON contracts FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

CREATE POLICY "Super Admin can update contracts"
  ON contracts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

CREATE POLICY "Gestor can approve contracts in department"
  ON contracts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Gestor de Departamento'
      AND users.department_id = contracts.department_id
      AND contracts.status = 'Pendente Aprovacao'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Gestor de Departamento'
      AND users.department_id = contracts.department_id
    )
  );

CREATE POLICY "Super Admin can delete contracts"
  ON contracts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

-- RLS Policies for audit_queue (Super Admin only)
CREATE POLICY "Super Admin can view audit queue"
  ON audit_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

CREATE POLICY "Super Admin can manage audit queue"
  ON audit_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for notification_settings
CREATE POLICY "Users can view own settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own settings"
  ON notification_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_department ON contracts(department_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_created_by ON contracts(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_queue_status ON audit_queue(status);
CREATE INDEX IF NOT EXISTS idx_audit_queue_department ON audit_queue(department_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_contract ON notifications(contract_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);