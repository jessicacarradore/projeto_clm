import React, { useEffect, useState } from 'react';
import { supabase, NotificationSettings } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email_enabled: true,
    in_app_enabled: true,
    reminder_90: true,
    reminder_60: true,
    reminder_30: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (data) {
          setSettings(data);
          setForm({
            email_enabled: data.email_enabled,
            in_app_enabled: data.in_app_enabled,
            reminder_90: data.reminder_days.includes(90),
            reminder_60: data.reminder_days.includes(60),
            reminder_30: data.reminder_days.includes(30),
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const reminder_days = [];
      if (form.reminder_90) reminder_days.push(90);
      if (form.reminder_60) reminder_days.push(60);
      if (form.reminder_30) reminder_days.push(30);

      if (settings) {
        const { error } = await supabase
          .from('notification_settings')
          .update({
            email_enabled: form.email_enabled,
            in_app_enabled: form.in_app_enabled,
            reminder_days,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('notification_settings').insert({
          user_id: user?.id,
          email_enabled: form.email_enabled,
          in_app_enabled: form.in_app_enabled,
          reminder_days,
        });

        if (error) throw error;
      }

      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-4 text-zinc-400">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">Configurações</h2>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
          {/* Notification Channels */}
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Bell size={20} />
              Canais de Notificação
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.email_enabled}
                  onChange={(e) => setForm({ ...form, email_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-600 text-red-600 cursor-pointer"
                />
                <span className="text-white">Notificações por Email</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.in_app_enabled}
                  onChange={(e) => setForm({ ...form, in_app_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-600 text-red-600 cursor-pointer"
                />
                <span className="text-white">Notificações no Sistema</span>
              </label>
            </div>
          </div>

          {/* Reminder Schedule */}
          <div className="pt-4 border-t border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Lembretes de Vencimento</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Receba notificações quando os contratos estiverem próximos do vencimento
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded border border-zinc-800 hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  checked={form.reminder_90}
                  onChange={(e) => setForm({ ...form, reminder_90: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-600 text-red-600 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="text-white font-medium">90 dias antes do vencimento</p>
                  <p className="text-xs text-zinc-400">Aviso com bastante antecedência</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded border border-zinc-800 hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  checked={form.reminder_60}
                  onChange={(e) => setForm({ ...form, reminder_60: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-600 text-red-600 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="text-white font-medium">60 dias antes do vencimento</p>
                  <p className="text-xs text-zinc-400">Lembrete padrão</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded border border-zinc-800 hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  checked={form.reminder_30}
                  onChange={(e) => setForm({ ...form, reminder_30: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-600 text-red-600 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="text-white font-medium">30 dias antes do vencimento</p>
                  <p className="text-xs text-zinc-400">Aviso final</p>
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-zinc-800 flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Save size={20} />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-600/20 border border-blue-600/30 rounded-lg">
          <p className="text-blue-400 text-sm">
            <strong>Nota:</strong> As notificações são baseadas na data de vencimento menos o período de aviso prévio de cada contrato.
          </p>
        </div>
      </div>
    </div>
  );
};
