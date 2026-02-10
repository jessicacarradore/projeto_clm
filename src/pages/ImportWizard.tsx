import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Department } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Upload, ChevronRight, ChevronLeft, Check } from 'lucide-react';

type Step = 'upload' | 'preview' | 'headers' | 'mapping' | 'department' | 'processing' | 'summary';

interface ParsedData {
  headers: string[];
  rows: Record<string, any>[];
  headerRowIndex: number;
}

interface ColumnMapping {
  [sourceCol: string]: string;
}

const REQUIRED_FIELDS = ['cnpj', 'razao_social', 'value_total'];
const FIELD_OPTIONS = [
  'cnpj',
  'razao_social',
  'nome_fantasia',
  'endereco',
  'value_total',
  'start_date',
  'end_date',
  'aviso_previo',
  'departamento',
];

export const ImportWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState({ queued: 0, skipped: 0, duplicates: 0 });

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase.from('departments').select('*').order('name');
      setDepartments(data || []);
    };
    fetchDepartments();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    try {
      let data: any = [];

      if (uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.xls')) {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      } else if (uploadedFile.name.endsWith('.csv')) {
        const text = await uploadedFile.text();
        data = Papa.parse(text).data;
      }

      if (data.length > 0) {
        setParsedData({
          headers: data[0] as string[],
          rows: data.slice(1) as Record<string, any>[],
          headerRowIndex: 0,
        });
        setStep('preview');
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Erro ao ler o arquivo. Verifique o formato.');
    }
  };

  const handleSelectHeaderRow = (rowIndex: number) => {
    if (!parsedData) return;
    const newData = { ...parsedData };
    newData.headers = parsedData.rows[rowIndex] as string[];
    newData.rows = parsedData.rows.slice(rowIndex + 1);
    newData.headerRowIndex = rowIndex;
    setParsedData(newData);
    setStep('mapping');
  };

  const handleMappingChange = (source: string, target: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [source]: target === '' ? undefined : target,
    }));
  };

  const handleProcessImport = async () => {
    if (!parsedData || !selectedDept || !user) return;

    setProcessing(true);
    let queued = 0;
    let duplicates = 0;
    const unmappedRows = [];

    try {
      // Check existing CNPJs
      const { data: existingContracts } = await supabase
        .from('contracts')
        .select('cnpj')
        .eq('department_id', selectedDept)
        .eq('status', 'Ativo');

      const existingCNPJs = new Set(existingContracts?.map((c) => c.cnpj) || []);

      // Process each row
      for (const row of parsedData.rows) {
        const mappedData: Record<string, any> = {};

        for (const [sourceCol, targetField] of Object.entries(columnMapping)) {
          if (targetField) {
            mappedData[targetField] = row[sourceCol];
          }
        }

        if (!mappedData.cnpj) continue;

        if (existingCNPJs.has(mappedData.cnpj)) {
          duplicates++;
          continue;
        }

        const { error } = await supabase.from('audit_queue').insert({
          source_data: mappedData,
          status: 'Pendente',
          department_id: selectedDept,
          imported_by: user.id,
        });

        if (!error) queued++;
        else unmappedRows.push(row);
      }

      setSummary({ queued, skipped: unmappedRows.length, duplicates });
      setStep('summary');
    } catch (error) {
      console.error('Error processing import:', error);
      alert('Erro ao processar importação');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {(['upload', 'preview', 'headers', 'mapping', 'department', 'processing', 'summary'] as const).map(
              (s, i) => (
                <React.Fragment key={s}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                      s === step
                        ? 'bg-red-600 text-white'
                        : ['upload', 'preview', 'headers', 'mapping', 'department', 'processing', 'summary']
                            .indexOf(step) > i
                        ? 'bg-green-600 text-white'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 6 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        ['upload', 'preview', 'headers', 'mapping', 'department', 'processing', 'summary'].indexOf(
                          step
                        ) > i
                          ? 'bg-green-600'
                          : 'bg-zinc-800'
                      }`}
                    ></div>
                  )}
                </React.Fragment>
              )
            )}
          </div>
          <p className="text-sm text-zinc-400">
            Passo {['upload', 'preview', 'headers', 'mapping', 'department', 'processing', 'summary'].indexOf(step) + 1} de 7
          </p>
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Importar Arquivo</h2>
            <p className="text-zinc-400 mb-6">Suporte para .xlsx, .xls e .csv</p>

            <div className="border-2 border-dashed border-zinc-700 rounded-lg p-12 text-center hover:border-red-600 transition-colors cursor-pointer">
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload size={48} className="mx-auto text-zinc-400 mb-4" />
                <p className="text-white font-medium mb-1">Clique ou arraste o arquivo aqui</p>
                <p className="text-zinc-400 text-sm">Formatos: .xlsx, .xls, .csv</p>
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
              </label>
            </div>

            {file && (
              <div className="mt-4 p-4 bg-green-600/20 border border-green-600/30 rounded-lg">
                <p className="text-green-500 text-sm flex items-center gap-2">
                  <Check size={16} />
                  {file.name} - {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
            )}

            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => navigate('/auditoria')}
                className="px-4 py-2 text-zinc-400 hover:text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep('preview')}
                disabled={!parsedData}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                Próximo <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Mapping */}
        {step === 'mapping' && parsedData && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Mapear Colunas</h2>
            <p className="text-zinc-400 mb-6">Associe as colunas do arquivo aos campos do sistema</p>

            <div className="space-y-4 mb-8">
              {parsedData.headers.map((header, i) => (
                <div key={i} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Coluna: {header}</label>
                    <input type="text" value={header} disabled className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-500" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Mapear para</label>
                    <select
                      value={columnMapping[header] || ''}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-red-600 transition-colors"
                    >
                      <option value="">Não mapear</option>
                      {FIELD_OPTIONS.map((field) => (
                        <option key={field} value={field}>
                          {field}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between gap-4">
              <button
                onClick={() => setStep('preview')}
                className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg transition-colors"
              >
                <ChevronLeft size={16} /> Voltar
              </button>
              <button
                onClick={() => setStep('department')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Próximo <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Department */}
        {step === 'department' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Selecionar Departamento</h2>
            <p className="text-zinc-400 mb-6">Escolha o departamento para estes contratos</p>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors mb-8"
            >
              <option value="">Selecione um departamento</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>

            <div className="flex justify-between gap-4">
              <button
                onClick={() => setStep('mapping')}
                className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg transition-colors"
              >
                <ChevronLeft size={16} /> Voltar
              </button>
              <button
                onClick={() => {
                  handleProcessImport();
                  setStep('processing');
                }}
                disabled={!selectedDept || processing}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {processing ? 'Processando...' : 'Processar'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Summary */}
        {step === 'summary' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Importação Concluída</h2>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-4">
                <p className="text-zinc-400 text-sm mb-2">Enfileirados</p>
                <p className="text-3xl font-bold text-green-500">{summary.queued}</p>
              </div>
              <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4">
                <p className="text-zinc-400 text-sm mb-2">Duplicados</p>
                <p className="text-3xl font-bold text-blue-500">{summary.duplicates}</p>
              </div>
              <div className="bg-orange-600/20 border border-orange-600/30 rounded-lg p-4">
                <p className="text-zinc-400 text-sm mb-2">Ignorados</p>
                <p className="text-3xl font-bold text-orange-500">{summary.skipped}</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/auditoria')}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Ir para Auditoria
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
