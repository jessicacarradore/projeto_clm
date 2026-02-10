import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, Department, AuditQueueItem, User } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { lookupCNPJ, formatCNPJ, validateCNPJ } from '../lib/cnpj';
import { Loader, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';

type Step = 'cadastral' | 'details' | 'financial' | 'attachments';

export const CreateContract: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('cadastral');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [filePreview, setFilePreview] = useState<{ name: string; size: string } | null>(null);

  const queueItem = location.state?.queueItem as AuditQueueItem | undefined;

  const [form, setForm] = useState({
    // Cadastral
    supplier_name: queueItem?.source_data?.razao_social || '',
    cnpj: queueItem?.source_data?.cnpj || '',
    nome_fantasia: queueItem?.source_data?.nome_fantasia || '',
    endereco: queueItem?.source_data?.endereco || '',

    // Details
    department_id: queueItem?.department_id || user?.department_id || '',
    category: '',
    cost_center: '',
    manager_id: '',

    // Financial & Prazos
    value_total: queueItem?.source_data?.value_total || '',
    original_proposal_value: '',
    start_date: queueItem?.source_data?.start_date || '',
    end_date: queueItem?.source_data?.end_date || '',
    aviso_previo: queueItem?.source_data?.aviso_previo || '30',
    payment_method: '',
    adjustment_index: '',
    adjustment_base_date: '',
    auto_renewal: false,
    fine_amount: '',
    has_guarantee: false,

    // Attachments
    file_url: queueItem?.source_data?.file_url || '',
    status: isAdmin ? 'Ativo' : 'Pendente Aprovacao',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        let query = supabase.from('departments').select('*').order('name');
        if (!isAdmin && user?.department_id) {
          query = query.eq('id', user.department_id);
        }
        const { data: depts } = await query;
        setDepartments(depts || []);

        if (depts && depts.length > 0 && !form.department_id) {
          setForm((prev) => ({ ...prev, department_id: depts[0].id }));
        }

        // Fetch users for manager selection
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .eq('active', true)
          .order('full_name');
        setUsers(usersData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, user?.department_id]);

  const handleCNPJBlur = async () => {
    if (!form.cnpj || !validateCNPJ(form.cnpj)) return;

    setCnpjLoading(true);
    try {
      const result = await lookupCNPJ(form.cnpj);
      if (result.ok) {
        setForm((prev) => ({
          ...prev,
          supplier_name: result.razao_social || prev.supplier_name,
          nome_fantasia: result.nome_fantasia || prev.nome_fantasia,
          endereco:
            result.logradouro && result.numero
              ? `${result.logradouro}, ${result.numero}${result.complemento ? ', ' + result.complemento : ''} - ${result.bairro}, ${result.municipio} - ${result.uf}`
              : prev.endereco,
        }));
      }
    } catch (err) {
      console.error('Error looking up CNPJ:', err);
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('contract-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('contract-files')
        .getPublicUrl(fileName);

      setForm((prev) => ({ ...prev, file_url: publicUrlData.publicUrl }));
      setFilePreview({ name: file.name, size: (file.size / 1024).toFixed(2) });
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Erro ao fazer upload do arquivo');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = async () => {
    if (!form.file_url) return;

    try {
      const fileName = form.file_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from('contract-files').remove([fileName]);
      }
      setForm((prev) => ({ ...prev, file_url: '' }));
      setFilePreview(null);
    } catch (error) {
      console.error('Error removing file:', error);
    }
  };

  const validateStep = (currentStep: Step): boolean => {
    switch (currentStep) {
      case 'cadastral':
        return !!(form.supplier_name && form.cnpj && validateCNPJ(form.cnpj));
      case 'details':
        return !!(form.department_id && form.category && form.cost_center);
      case 'financial':
        return !!(form.value_total && form.start_date && form.end_date && form.payment_method);
      case 'attachments':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      setError(`Por favor, preencha todos os campos obrigatórios da etapa ${step}`);
      return;
    }
    setError('');
    const steps: Step[] = ['cadastral', 'details', 'financial', 'attachments'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    const steps: Step[] = ['cadastral', 'details', 'financial', 'attachments'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!form.supplier_name || !form.cnpj || !form.department_id || !form.value_total) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      if (!validateCNPJ(form.cnpj)) {
        throw new Error('CNPJ inválido');
      }

      const { error: insertError } = await supabase.from('contracts').insert({
        supplier_name: form.supplier_name,
        cnpj: form.cnpj.replace(/\D/g, ''),
        nome_fantasia: form.nome_fantasia,
        endereco: form.endereco,
        department_id: form.department_id,
        value_total: parseFloat(form.value_total),
        start_date: form.start_date,
        end_date: form.end_date,
        aviso_previo: parseInt(form.aviso_previo),
        status: form.status,
        created_by: user?.id,
        file_url: form.file_url,
        category: form.category,
        cost_center: form.cost_center,
        payment_method: form.payment_method,
        adjustment_index: form.adjustment_index,
        adjustment_base_date: form.adjustment_base_date,
        auto_renewal: form.auto_renewal,
        fine_amount: form.fine_amount ? parseFloat(form.fine_amount) : 0,
        has_guarantee: form.has_guarantee,
        manager_id: form.manager_id || null,
        original_proposal_value: form.original_proposal_value ? parseFloat(form.original_proposal_value) : null,
      });

      if (insertError) throw insertError;

      if (queueItem) {
        await supabase
          .from('audit_queue')
          .update({ status: 'Convertido', processed_by: user?.id, processed_at: new Date().toISOString() })
          .eq('id', queueItem.id);
      }

      navigate(isAdmin ? '/contratos' : '/minhas-solicitacoes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar contrato');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-4 text-zinc-400">Carregando...</p>
        </div>
      </div>
    );
  }

  const stepLabels = {
    cadastral: 'Dados Cadastrais',
    details: 'Detalhes',
    financial: 'Financeiro & Prazos',
    attachments: 'Anexos',
  };

  const stepIndex = ['cadastral', 'details', 'financial', 'attachments'].indexOf(step) + 1;

  return (
    <div className="p-6">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold text-white mb-6">
          {queueItem ? 'Converter para Contrato' : 'Novo Contrato'}
        </h2>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex gap-2 mb-4">
            {['cadastral', 'details', 'financial', 'attachments'].map((s, i) => (
              <button
                key={s}
                onClick={() => {
                  if (i < stepIndex - 1) setStep(s as Step);
                }}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  i < stepIndex - 1 ? 'bg-green-600' : i === stepIndex - 1 ? 'bg-red-600' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-zinc-400">
            Passo {stepIndex} de 4 - {stepLabels[step]}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>
          )}

          {/* Step: Cadastral */}
          {step === 'cadastral' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Dados Cadastrais</h3>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">CNPJ *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.cnpj}
                    onChange={(e) => setForm({ ...form, cnpj: formatCNPJ(e.target.value) })}
                    onBlur={handleCNPJBlur}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                    required
                  />
                  {cnpjLoading && <Loader className="absolute right-3 top-3 animate-spin text-red-500" size={18} />}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Razão Social *</label>
                <input
                  type="text"
                  value={form.supplier_name}
                  onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Nome Fantasia</label>
                <input
                  type="text"
                  value={form.nome_fantasia}
                  onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Endereço</label>
                <input
                  type="text"
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Step: Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Detalhes do Contrato</h3>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Departamento *</label>
                <select
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                  required
                >
                  <option value="">Selecione um departamento</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Categoria *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  <option value="Serviço">Serviço</option>
                  <option value="Produto">Produto</option>
                  <option value="Locação">Locação</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Centro de Custo *</label>
                <input
                  type="text"
                  value={form.cost_center}
                  onChange={(e) => setForm({ ...form, cost_center: e.target.value })}
                  placeholder="Ex: CC-001"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Gestor Responsável</label>
                <select
                  value={form.manager_id}
                  onChange={(e) => setForm({ ...form, manager_id: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                >
                  <option value="">Nenhum</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step: Financial */}
          {step === 'financial' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Financeiro & Prazos</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Valor Total *</label>
                  <input
                    type="number"
                    value={form.value_total}
                    onChange={(e) => setForm({ ...form, value_total: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Valor da Proposta Original</label>
                  <input
                    type="number"
                    value={form.original_proposal_value}
                    onChange={(e) => setForm({ ...form, original_proposal_value: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Data Início *</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Data Fim *</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Aviso Prévio (dias)</label>
                  <input
                    type="number"
                    value={form.aviso_previo}
                    onChange={(e) => setForm({ ...form, aviso_previo: e.target.value })}
                    placeholder="30"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Método de Pagamento *</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Transferência">Transferência</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Índice de Reajuste</label>
                  <select
                    value={form.adjustment_index}
                    onChange={(e) => setForm({ ...form, adjustment_index: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                  >
                    <option value="">Nenhum</option>
                    <option value="IPCA">IPCA</option>
                    <option value="IGPM">IGPM</option>
                    <option value="INPC">INPC</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Data Base Reajuste (MM/YYYY)</label>
                  <input
                    type="text"
                    value={form.adjustment_base_date}
                    onChange={(e) => setForm({ ...form, adjustment_base_date: e.target.value })}
                    placeholder="01/2024"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Valor da Multa</label>
                  <input
                    type="number"
                    value={form.fine_amount}
                    onChange={(e) => setForm({ ...form, fine_amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors"
                  />
                </div>

                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.auto_renewal}
                      onChange={(e) => setForm({ ...form, auto_renewal: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-600 text-red-600 cursor-pointer"
                    />
                    <span className="text-white">Renovação Automática</span>
                  </label>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.has_guarantee}
                  onChange={(e) => setForm({ ...form, has_guarantee: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-600 text-red-600 cursor-pointer"
                />
                <span className="text-white">Possui Garantia</span>
              </label>
            </div>
          )}

          {/* Step: Attachments */}
          {step === 'attachments' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Anexos</h3>

              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-red-600 transition-colors">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload size={32} className="mx-auto text-zinc-400 mb-2" />
                  <p className="text-white font-medium mb-1">Clique ou arraste o PDF</p>
                  <p className="text-zinc-400 text-sm">Tamanho máximo: 10MB</p>
                  <input
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf"
                    disabled={uploadingFile}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadingFile && (
                <div className="flex items-center justify-center gap-2 text-zinc-400">
                  <Loader className="animate-spin" size={16} />
                  Enviando arquivo...
                </div>
              )}

              {filePreview && (
                <div className="p-3 bg-green-600/20 border border-green-600/30 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-green-400 text-sm font-medium">{filePreview.name}</p>
                    <p className="text-green-500 text-xs">{filePreview.size} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 text-green-400 hover:text-red-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between gap-4 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 'cadastral'}
              className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white disabled:opacity-50 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              <ChevronLeft size={16} /> Anterior
            </button>

            {step === 'attachments' ? (
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {submitting ? 'Salvando...' : 'Salvar Contrato'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Próximo <ChevronRight size={16} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
