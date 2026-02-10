import axios from 'axios';
import { BrasilAPIResponse } from './supabase';

export const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/\D/g, '');

  if (cleaned.length !== 14) return false;

  // Check for sequences of same digit
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  // Validate using check digits
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);

  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
};

export const formatCNPJ = (cnpj: string): string => {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export const lookupCNPJ = async (cnpj: string): Promise<Partial<BrasilAPIResponse>> => {
  const cleaned = cnpj.replace(/\D/g, '');

  if (!validateCNPJ(cleaned)) {
    return { status: 'ERROR', ok: false, message: 'CNPJ inválido' };
  }

  try {
    const response = await axios.get<BrasilAPIResponse>(
      `https://brasilapi.com.br/api/cnpj/v1/${cleaned}`
    );

    if (response.data.status === 'OK') {
      return {
        status: 'OK',
        ok: true,
        razao_social: response.data.razao_social,
        nome_fantasia: response.data.nome_fantasia,
        logradouro: response.data.logradouro,
        numero: response.data.numero,
        bairro: response.data.bairro,
        municipio: response.data.municipio,
        uf: response.data.uf,
      };
    }

    return { status: 'ERROR', ok: false, message: response.data.message };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { status: 'ERROR', ok: false, message: 'CNPJ não encontrado' };
    }
    return { status: 'ERROR', ok: false, message: 'Erro ao buscar CNPJ' };
  }
};
