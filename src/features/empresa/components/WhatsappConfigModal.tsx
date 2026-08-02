import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import { api } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function WhatsappConfigModal({
  connectionId,
  currentNumber,
  onClose,
}: {
  connectionId: string;
  currentNumber: string | null;
  onClose: () => void;
}) {
  const [phoneNumber, setPhoneNumber] = useState(currentNumber ?? '');
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (number: string) => {
      const res = await api.put(`/conexiones/${connectionId}/whatsapp`, { phoneNumber: number });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-connections'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(phoneNumber);
  };

  return (
    <PortalOverlay>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Smartphone className="size-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">Configurar WhatsApp</h3>
            <p className="text-sm text-ink-soft">Canal de ingesta automatizado</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Número de WhatsApp de la empresa</label>
            <input
              type="text"
              required
              placeholder="Ej: 5493815551234"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-xl border border-line px-4 py-3 text-sm focus:border-granate focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-ink-soft">Formato internacional sin el `+`.</p>
          </div>

          {error && (
            <p className="text-sm text-danger">{(error as any).response?.data?.error?.message || 'Error al guardar'}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending} disabled={!phoneNumber.trim()}>
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
    </PortalOverlay>
  );
}
