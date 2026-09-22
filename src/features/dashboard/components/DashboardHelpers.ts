import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MacroSnapshot } from '@/lib/types';
import { FileText, FileInput, Image, MessageSquare } from 'lucide-react';

export interface RecentDoc {
  id: string;
  status: string;
  sourceType: 'TEXT' | 'PDF' | 'IMAGE' | 'WHATSAPP';
  fileName: string | null;
  rawContent: string;
  createdAt: string;
  connection: { company: { id: string; name: string } };
  classificationAudits: Array<{ documentType: string; costSection: string }>;
}

export function useRecentDocs() {
  return useQuery({
    queryKey: ['automatizacion', 'feed'],
    queryFn: async () => {
      const res = await api.get<{ data: RecentDoc[]; total: number }>('/validaciones/feed');
      return res.data.data
        .filter((d) => d.status === 'APPROVED')
        .slice(0, 5);
    },
    staleTime: 2 * 60 * 1000,
  });
}

export const SOURCE_ICON: Record<string, typeof FileText> = {
  TEXT: FileText, PDF: FileInput, IMAGE: Image, WHATSAPP: MessageSquare,
};

export const INDUSTRY_CLASSES: Record<string, string> = {
  'Agropecuaria':     'bg-amber-50 text-amber-700 border-amber-200/50',
  'Manufactura':      'bg-granate-tenue text-granate border-granate/10',
  'Transporte':       'bg-indigo-50 text-indigo-700 border-indigo-200/50',
  'Construcción':     'bg-orange-50 text-orange-700 border-orange-200/50',
  'Comercio':         'bg-sky-50 text-sky-700 border-sky-200/50',
  'Servicios':        'bg-zinc-100 text-zinc-700 border-zinc-200/60',
  'Logística':        'bg-emerald-50 text-emerald-700 border-emerald-200/50',
  'Gastronomía':      'bg-rose-50 text-rose-700 border-rose-200/50',
  'Salud':            'bg-teal-50 text-teal-700 border-teal-200/50',
  'Tecnología':       'bg-violet-50 text-violet-700 border-violet-200/50',
};

export function industryChip(industry: string | null | undefined): string {
  if (!industry) return 'bg-zinc-50 text-zinc-400 border-zinc-100';
  for (const [key, classes] of Object.entries(INDUSTRY_CLASSES)) {
    if (industry.toLowerCase().includes(key.toLowerCase())) return classes;
  }
  return 'bg-zinc-100 text-zinc-700 border-zinc-200/60';
}

export function companyHealth(structCount: number): { label: string; color: string; dot: string } {
  if (structCount === 0) return { label: 'Sin datos',  color: 'text-zinc-400',   dot: 'bg-zinc-300' };
  if (structCount <= 1)  return { label: 'Inicial',    color: 'text-zinc-500',  dot: 'bg-zinc-400' };
  if (structCount <= 3)  return { label: 'En progreso',color: 'text-granate',   dot: 'bg-action-soft animate-pulse' };
  return                         { label: 'Activo',    color: 'text-emerald-700',dot: 'bg-emerald-500' };
}

export function useMacroLatest() {
  return useQuery({
    queryKey: ['macro', 'latest'],
    queryFn: async () => {
      const res = await api.get<{ data: MacroSnapshot[] }>('/macro/latest');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function fmtARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n);
}

export function greet(name?: string | null) {
  const h = new Date().getHours();
  const firstName = name?.trim().split(' ')[0];
  const destinatario = firstName ? `, ${firstName}` : '';
  if (h < 12) return `Buenos días${destinatario}`;
  if (h < 19) return `Buenas tardes${destinatario}`;
  return `Buenas noches${destinatario}`;
}
