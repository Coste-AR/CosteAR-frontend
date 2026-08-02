import { useState } from 'react';
import { Plus, Users, KeyRound, Trash2, Eye, EyeOff, Copy } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useOperators, useGenerateOperatorAccess, useRevokeOperator, useResetOperatorPassword, type GeneratedAccess } from '@/features/empresa-portal/empresa-portal-hooks';
import { useEmpresaConnections } from '@/features/empresa/empresa-hooks';
import { WhatsappConfigModal } from '@/features/empresa/components/WhatsappConfigModal';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api';

export function CompanyOperatorsTab({ companyId }: { companyId: string }) {
  const { data: operators = [] } = useOperators(companyId);
  const generate = useGenerateOperatorAccess(companyId);
  const revoke = useRevokeOperator();
  const reset = useResetOperatorPassword();
  const [resetResult, setResetResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [operatorFullName, setOperatorFullName] = useState('');
  const [operatorRole, setOperatorRole] = useState('');
  const [operatorEmail, setOperatorEmail] = useState('');
  const [generatedAccess, setGeneratedAccess] = useState<GeneratedAccess | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  const { data: connections = [] } = useEmpresaConnections();
  const connection = connections.find(c => c.companyId === companyId);

  const emailValid = /\S+@\S+\.\S+/.test(operatorEmail);

  const handleGenerate = async () => {
    if (!operatorFullName.trim() || !emailValid) return;
    setGenerateError(null);
    const displayName = operatorRole.trim()
      ? `${operatorFullName.trim()} — ${operatorRole.trim()}`
      : operatorFullName.trim();
    try {
      const result = await generate.mutateAsync({ operatorName: displayName, operatorEmail: operatorEmail.trim() });
      setGeneratedAccess(result);
      setOperatorFullName('');
      setOperatorRole('');
      setOperatorEmail('');
      setShowForm(false);
    } catch (e) {
      setGenerateError(apiErrorMessage(e));
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleReset = async (operatorId: string) => {
    try {
      const result = await reset.mutateAsync(operatorId);
      setResetResult(result);
      setGeneratedAccess(null);
    } catch {
      // error silently
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Personal autorizado"
        description="Usuarios de esta empresa que pueden cargar documentos al portal"
        action={
          <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> Invitar operador
          </Button>
        }
      />
      <CardBody>
        {showForm && (
          <PortalOverlay>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-rise border border-zinc-150 space-y-3">
              <h3 className="text-lg font-bold text-zinc-900 mb-1">Invitar operador</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nombre completo"
                  placeholder="Ej: María García"
                  value={operatorFullName}
                  onChange={(e) => setOperatorFullName(e.target.value)}
                />
                <Input
                  label="Cargo / área (opcional)"
                  placeholder="Ej: Compras, Administración…"
                  value={operatorRole}
                  onChange={(e) => setOperatorRole(e.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Email"
                  type="email"
                  placeholder="maria@empresa.com"
                  value={operatorEmail}
                  onChange={(e) => setOperatorEmail(e.target.value)}
                />
                {operatorEmail.length > 0 && !emailValid && (
                  <p className="mt-1 text-[12px] text-danger">Email inválido</p>
                )}
              </div>
              <p className="text-[12px] text-ink-soft">
                El operador recibirá un email con sus credenciales temporales y podrá cambiar su contraseña al ingresar.
              </p>
              {generateError && (
                <p className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{generateError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleGenerate} loading={generate.isPending} disabled={!operatorFullName.trim() || !emailValid}>
                  Generar acceso y enviar invitación
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
          </PortalOverlay>
        )}

        {generatedAccess && (
          <div className="mb-5 rounded-md border border-action/30 bg-action/5 p-4 animate-rise">
            <p className="mb-3 text-[13px] font-semibold text-ink">
              Acceso generado — compartí estas credenciales con el operador. Solo se muestran una vez.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <CredField
                label="Email / Usuario"
                value={generatedAccess.email}
                copied={copied === 'email'}
                onCopy={() => copyText(generatedAccess.email, 'email')}
              />
              {generatedAccess.tempPassword ? (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft mb-1">
                    Contraseña temporal
                  </label>
                  <div className="flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2">
                    <span className="flex-1 font-mono text-sm text-ink">
                      {showPassword ? generatedAccess.tempPassword : '••••••••••••'}
                    </span>
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-ink-soft hover:text-ink">
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(generatedAccess.tempPassword!, 'pass')}
                      className={cn('text-ink-soft hover:text-ink', copied === 'pass' && 'text-green-600')}
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft mb-1">
                    Código de invitación
                  </label>
                  <div className="flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2">
                    <span className="flex-1 font-mono text-sm text-ink">{generatedAccess.inviteCode ?? '—'}</span>
                    <button
                      type="button"
                      onClick={() => copyText(generatedAccess.inviteCode ?? '', 'pass')}
                      className={cn('text-ink-soft hover:text-ink', copied === 'pass' && 'text-green-600')}
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-soft">El operador ya tiene cuenta — que acepte este código desde su perfil.</p>
                </div>
              )}
            </div>
            <p className="mt-3 text-[12px] text-ink-soft">
              {generatedAccess.tempPassword
                ? <>El operador iniciará sesión con estas credenciales y verá solo la pantalla de carga de documentos.</>
                : 'Se envió un email al operador con el código de invitación.'}
            </p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setGeneratedAccess(null)}>
              Entendido, cerrar
            </Button>
          </div>
        )}

        {resetResult && (
          <div className="mb-5 rounded-md border border-amber-400/40 bg-amber-50/60 p-4 animate-rise">
            <p className="mb-3 text-[13px] font-semibold text-ink">
              Acceso reseteado — compartí las nuevas credenciales con el operador. Solo se muestran una vez.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <CredField
                label="Email / Usuario"
                value={resetResult.email}
                copied={copied === 'reset-email'}
                onCopy={() => copyText(resetResult.email, 'reset-email')}
              />
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft mb-1">
                  Nueva contraseña temporal
                </label>
                <div className="flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2">
                  <span className="flex-1 font-mono text-sm text-ink">
                    {showPassword ? resetResult.tempPassword : '••••••••••••'}
                  </span>
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-ink-soft hover:text-ink">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(resetResult.tempPassword, 'reset-pass')}
                    className={cn('text-ink-soft hover:text-ink', copied === 'reset-pass' && 'text-green-600')}
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-ink-soft">
              El operador deberá cambiar su contraseña al ingresar por primera vez con estas credenciales.
            </p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setResetResult(null)}>
              Entendido, cerrar
            </Button>
          </div>
        )}

        {operators.length === 0 && !showForm ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Users className="size-8 text-ink-soft/40" />
            <p className="text-[13px] text-ink-soft">Todavía no hay personal autorizado para esta empresa.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {operators.map((op) => {
              const parts = op.name.split(' — ');
              const actualName = parts[0];
              const roleInfo = parts[1];

              return (
              <li key={op.id} className="flex items-center justify-between gap-4 py-4 px-2 hover:bg-zinc-50/50 rounded-xl transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-granate/10 text-granate shadow-sm">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-ink">{actualName}</p>
                      {roleInfo && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft bg-surface-alt px-2 py-0.5 rounded-full border border-line">
                          {roleInfo}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[12px] font-medium text-ink-soft">{op.email}</p>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100">
                        <span className="size-1.5 rounded-full bg-emerald-500" /> Permisos: Solo carga
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={op.isActive ? 'ok' : 'idle'}>
                    {op.isActive ? 'Activo' : 'Revocado'}
                  </StatusBadge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-600 hover:bg-amber-50"
                    onClick={() => handleReset(op.id)}
                    loading={reset.isPending}
                    title="Resetear acceso"
                  >
                    <KeyRound className="size-4" />
                  </Button>
                  {op.isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger/10"
                      onClick={() => revoke.mutate(op.id)}
                      loading={revoke.isPending}
                      title="Revocar acceso"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>

    {connection && (
      <Card>
        <CardHeader
          title="Canal de WhatsApp"
          description="Automatiza la ingesta conectando un número de WhatsApp"
          action={
            <Button size="sm" variant="secondary" onClick={() => setShowWhatsappModal(true)}>
              {connection.whatsappPhoneNumber ? 'Cambiar número' : 'Configurar WhatsApp'}
            </Button>
          }
        />
        <CardBody>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Eye className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                {connection.whatsappPhoneNumber ? `WhatsApp configurado: +${connection.whatsappPhoneNumber}` : 'Sin configurar'}
              </p>
              <p className="text-xs text-ink-soft">
                Los mensajes enviados a la IA desde este número se cargarán automáticamente.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    )}

    {showWhatsappModal && connection && (
      <WhatsappConfigModal
        connectionId={connection.id}
        currentNumber={connection.whatsappPhoneNumber}
        onClose={() => setShowWhatsappModal(false)}
      />
    )}
    </div>
  );
}

function CredField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div>
      <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft mb-1">{label}</label>
      <div className="flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2">
        <span className="flex-1 font-mono text-sm text-ink">{value}</span>
        <button
          type="button"
          onClick={onCopy}
          className={cn('text-ink-soft hover:text-ink', copied && 'text-green-600')}
        >
          <Copy className="size-4" />
        </button>
      </div>
    </div>
  );
}
