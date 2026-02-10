export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('pt-BR');
};

export const getDaysUntilDeadline = (endDate: string, aviso_previo: number): number => {
  const end = new Date(endDate);
  const deadline = new Date(end.getTime() - aviso_previo * 24 * 60 * 60 * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const diff = deadline.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/\D/g, '').substring(0, -2) + '.' + value.slice(-2)) || 0;
};
