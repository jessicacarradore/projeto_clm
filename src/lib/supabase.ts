import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'Super Admin' | 'Gestor de Departamento' | 'Solicitante';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  supplier_name: string;
  cnpj: string;
  nome_fantasia: string | null;
  endereco: string | null;
  department_id: string;
  status: 'Pendente Aprovacao' | 'Ativo' | 'Encerrado' | 'Rejeitado';
  value_total: number;
  start_date: string;
  end_date: string;
  aviso_previo: number;
  file_url: string | null;
  created_by: string;
  approver_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  category?: 'Serviço' | 'Produto' | 'Locação' | null;
  cost_center?: string | null;
  payment_method?: 'Boleto' | 'Transferência' | null;
  adjustment_index?: 'IPCA' | 'IGPM' | 'INPC' | 'Outro' | null;
  adjustment_base_date?: string | null;
  auto_renewal?: boolean;
  fine_amount?: number;
  has_guarantee?: boolean;
  manager_id?: string | null;
  original_proposal_value?: number | null;
}

export interface AuditQueueItem {
  id: string;
  source_data: Record<string, any>;
  status: 'Pendente' | 'Ignorado' | 'Convertido';
  department_id: string;
  imported_by: string;
  import_date: string;
  processed_at: string | null;
  processed_by: string | null;
  processing_notes: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'contract_reminder_90' | 'contract_reminder_60' | 'contract_reminder_30';
  contract_id: string;
  message: string;
  email_sent: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  reminder_days: number[];
  created_at: string;
  updated_at: string;
}

export interface BrasilAPIResponse {
  status: 'OK' | 'ERROR';
  ok: boolean;
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  message?: string;
}
