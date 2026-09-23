import { AppShell } from '@/components/layout/AppShell';
import { AdvisorPanel } from '@/features/advisor/AdvisorPanel';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import type { Alert } from '@/lib/types';
import { BellRing } from 'lucide-react';
import { useAlerts, useMarkAlertRead } from './alert-hooks';
import { AlertRulesPanel } from './AlertRulesPanel';
import { MacroRiskPanel } from './MacroRiskPanel';

function activeAlertCount(alerts: Alert[]): number {
  return alerts.filter((alert) => !alert.isRead && !alert.motivoNoEvaluada).length;
}

function alertStatus(alert: Alert): 'idle' | 'warn' | 'danger' {
  if (alert.motivoNoEvaluada) return 'warn';
  if (alert.severidad === 'CRITICA') return 'danger';
  if (alert.severidad === 'ADVERTENCIA') return 'warn';
  return 'idle';
}

export function AlertsPage() {
  const { data: alerts = [], isLoading, isError } = useAlerts();
  const markRead = useMarkAlertRead();
  const activeCount = activeAlertCount(alerts);
  const notEvaluatedCount = alerts.filter((alert) => alert.motivoNoEvaluada).length;

  return (
    <AppShell wide>
      <div className="mb-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-2 text-granate">
          <BellRing className="size-5" aria-hidden="true" />
          <h1 className="text-2xl font-extrabold">Alertas</h1>
        </div>
        <p className="mt-2 text-sm text-ink-soft">Revisá los indicadores que necesitan atención y configurá los avisos de cada negocio.</p>
        <div className="mt-4 flex flex-wrap gap-4 border-t border-line pt-4 text-sm text-ink">
          <p>Alertas activas: <strong data-testid="alertas-activas">{activeCount}</strong></p>
          <p>Sin evaluar: <strong data-testid="alertas-sin-evaluar">{notEvaluatedCount}</strong></p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="mb-5">
          <AdvisorPanel kind="alerts" label="Priorizar alertas" context={{
            alertas: alerts.slice(0, 40).map((alert) => ({
              mensaje: alert.motivoNoEvaluada ?? alert.message,
              leida: alert.isRead,
              fecha: alert.createdAt,
            })),
          }} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Lista de alertas" />
            <CardBody>
              {isLoading ? <p className="text-sm text-ink-soft">Cargando alertas…</p>
                : isError ? <p role="alert" className="text-sm text-danger">No se pudieron cargar las alertas.</p>
                : alerts.length === 0 ? <p className="py-8 text-center text-sm text-ink-soft">Sin alertas registradas.</p>
                : <ul className="space-y-3">
                  {alerts.map((alert) => (
                    <li key={alert.id} className="rounded-xl border border-line bg-surface p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <StatusBadge status={alertStatus(alert)}>
                            {alert.motivoNoEvaluada ? 'Sin evaluar' : alert.severidad === 'CRITICA' ? 'Crítica' : alert.severidad === 'ADVERTENCIA' ? 'Advertencia' : 'Información'}
                          </StatusBadge>
                          <p className="font-bold text-ink">{alert.indicadorEtiqueta ?? 'Alerta'}</p>
                          {alert.motivoNoEvaluada ? (
                            <p className="text-sm text-warn">No se pudo evaluar: {alert.motivoNoEvaluada}</p>
                          ) : <p className="text-sm text-ink">{alert.message}</p>}
                          {(alert.actualValue !== null || alert.threshold !== null) && (
                            <p className="text-xs text-ink-soft">
                              Valor: {alert.actualValue ?? 'Sin dato'} {alert.actualValue !== null ? alert.unidadValor : ''} · Umbral: {alert.threshold ?? 'Sin dato'} {alert.threshold !== null ? alert.unidadUmbral : ''}
                            </p>
                          )}
                          <p className="text-xs text-ink-soft">Desde {formatDate(alert.createdAt)}</p>
                        </div>
                        {!alert.isRead && <Button variant="ghost" size="sm" onClick={() => markRead.mutate(alert.id)}>Marcar leída</Button>}
                      </div>
                    </li>
                  ))}
                </ul>}
            </CardBody>
          </Card>
          <MacroRiskPanel />
        </div>
        <AlertRulesPanel />
      </div>
    </AppShell>
  );
}
