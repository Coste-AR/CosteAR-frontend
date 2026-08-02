import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BookOpen, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '@/lib/api';

export function VaultProposalsSection() {
  const queryClient = useQueryClient();
  const [proposalToReject, setProposalToReject] = useState<string | null>(null);
  const { data: proposals, isLoading } = useQuery({
    queryKey: ['vault-proposals'],
    queryFn: () => api.get('/vault/proposals').then(res => res.data.data),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/vault/proposals/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-proposals'] });
      toast.success('Propuesta aprobada e incorporada a la Bóveda RAG.');
    },
    onError: (err) => {
      toast.error('Error al aprobar: ' + apiErrorMessage(err));
    }
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.post(`/vault/proposals/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-proposals'] });
      toast.success('Propuesta rechazada.');
    },
  });

  if (isLoading) return <div className="h-32 animate-pulse bg-zinc-100 rounded-xl" />;
  if (!proposals || proposals.length === 0) {
    return (
      <Card className="border-dashed bg-zinc-50/50">
        <CardBody className="py-8 text-center text-zinc-500 flex flex-col items-center">
          <BookOpen className="size-8 text-zinc-300 mb-3" />
          <p>No hay propuestas de aprendizaje nuevas.</p>
          <p className="text-sm">El pipeline nocturno generará sugerencias cuando detecte nuevos rubros.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
    <div className="space-y-4">
      {proposals.map((p: any) => (
        <Card key={p.id} className="border-amber-200 bg-amber-50/30">
          <CardBody className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                  <BookOpen className="size-4 text-amber-600" />
                  {p.title}
                </h3>
                <p className="text-sm text-zinc-600 mt-1">
                  Archivo destino: <span className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded text-amber-800">{p.sourceFile}</span>
                </p>
                <p className="text-sm text-zinc-600 mt-2 italic border-l-2 border-amber-300 pl-3">
                  "{p.justification}"
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap">
              {p.proposedText}
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <Button 
                variant="ghost" 
                onClick={() => setProposalToReject(p.id)}
                disabled={reject.isPending || approve.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <XCircle className="size-4 mr-2" />
                Descartar
              </Button>
              <Button 
                onClick={() => approve.mutate(p.id)}
                disabled={reject.isPending || approve.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <CheckCircle2 className="size-4 mr-2" />
                Aprobar e Integrar
              </Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>

      <ConfirmDialog
        open={proposalToReject !== null}
        title="Rechazar propuesta"
        message="¿Estás seguro de rechazar esta propuesta de la IA?"
        confirmLabel="Rechazar"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={() => {
          if (proposalToReject) reject.mutate(proposalToReject);
          setProposalToReject(null);
        }}
        onCancel={() => setProposalToReject(null)}
      />
    </>
  );
}
