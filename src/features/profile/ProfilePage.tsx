import { useState, useRef } from 'react';
import { ShieldCheck, ShieldOff, Camera, User, Settings, Bell, Palette, Lock, PaletteIcon } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth-store';
import { api, apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AvatarCropModal } from './AvatarCropModal';

const MAX_AVATAR_BYTES = 6 * 1024 * 1024;

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const [qr, setQr] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Foto de perfil: seleccionar archivo → recortar → subir.
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError(null);
    if (!file.type.startsWith('image/')) { setAvatarError('El archivo tiene que ser una imagen.'); return; }
    if (file.size > MAX_AVATAR_BYTES) { setAvatarError('La imagen supera los 6 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async (data: { imageData: string; mimeType: string }) => {
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const res = await api.post<{ data: { avatarUrl: string } }>('/user/avatar', data);
      patchUser({ avatarUrl: res.data.data.avatarUrl });
      setCropSrc(null);
    } catch (e) {
      setAvatarError(apiErrorMessage(e));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const startSetup = async () => {
    setError(null);
    try {
      const res = await api.post<{ data: { qrDataUrl: string } }>('/auth/2fa/setup');
      setQr(res.data.data.qrDataUrl);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const confirm = async () => {
    setError(null);
    try {
      const res = await api.post<{ data: { backupCodes: string[] } }>('/auth/2fa/confirm', { code });
      setBackupCodes(res.data.data.backupCodes);
      setQr(null);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const [activeTab, setActiveTab] = useState<'cuenta' | 'seguridad' | 'preferencias' | 'personalizacion'>('cuenta');

  return (
    <AppShell>
      <PageHeader title="Mi perfil" description="Administrá tu cuenta, seguridad y preferencias" />

      {/* Tabs */}
      <div className="mb-6 flex overflow-x-auto border-b border-line pb-[1px]">
        {[
          { id: 'cuenta', label: 'Cuenta', icon: User },
          { id: 'seguridad', label: 'Seguridad', icon: Lock },
          { id: 'preferencias', label: 'Preferencias', icon: Bell },
          { id: 'personalizacion', label: 'Personalización', icon: Palette },
        ].map((t) => {
          const ActiveIcon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors border-transparent whitespace-nowrap',
                active
                  ? 'border-granate text-granate font-semibold'
                  : 'text-ink-soft hover:text-ink hover:bg-zinc-50'
              )}
            >
              <ActiveIcon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* TAB: CUENTA */}
        {activeTab === 'cuenta' && (
          <Card className="lg:col-span-2 max-w-2xl">
            <CardHeader title="Datos personales" description="Tu información de cuenta" />
            <CardBody className="space-y-5">
              {/* Foto de perfil */}
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Foto de perfil" className="size-20 rounded-full border border-line object-cover shadow-sm" />
                  ) : (
                    <div className="flex size-20 items-center justify-center rounded-full border border-granate/10 bg-granate-tenue text-granate shadow-sm">
                      <User className="size-8" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    title="Cambiar foto"
                    className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-granate text-white shadow-md transition-colors hover:bg-action"
                  >
                    <Camera className="size-3.5" />
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">Foto de perfil</p>
                  <p className="text-[12px] text-ink-soft">JPG, PNG o WebP · hasta 6 MB. Vas a poder recortarla.</p>
                  {avatarError && <p className="mt-1 text-[12px] font-semibold text-danger">{avatarError}</p>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickFile} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-line bg-surface-alt p-3.5">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">Nombre</div>
                  <div className="mt-0.5 truncate text-sm font-bold text-ink">{user?.name}</div>
                </div>
                <div className="rounded-2xl border border-line bg-surface-alt p-3.5">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">Email</div>
                  <div className="mt-0.5 truncate text-sm font-bold text-ink">{user?.email}</div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* TAB: SEGURIDAD */}
        {activeTab === 'seguridad' && (
          <Card className="lg:col-span-2 max-w-2xl">
            <CardHeader
              title="Verificación en dos pasos"
              description="Protegé tu cuenta con un segundo factor (TOTP)"
            />
            <CardBody className="space-y-4">
              {backupCodes ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-ok/20 bg-ok/10 text-ok">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink">2FA activado</p>
                      <p className="text-[12px] text-ink-soft">Tu cuenta está protegida con un segundo factor</p>
                    </div>
                  </div>
                  <p className="text-[13px] text-ink-soft">
                    Guardá estos códigos de respaldo en un lugar seguro. No se vuelven a mostrar.
                  </p>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface-alt p-4">
                    {backupCodes.map((c) => (
                      <span key={c} className="tabular text-sm font-bold text-ink">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ) : qr ? (
                <div className="space-y-3">
                  <p className="text-[13px] text-ink-soft">
                    Escaneá el código con Google Authenticator o Authy y confirmá con el código de 6
                    dígitos.
                  </p>
                  <img src={qr} alt="QR de configuración 2FA" className="size-44 rounded-2xl border border-line bg-white p-2 shadow-sm" />
                  <Input
                    label="Código de verificación"
                    numeric
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="000000"
                  />
                  <Button size="sm" onClick={confirm}>
                    Confirmar y activar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface-alt p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-idle/20 bg-idle/10 text-idle">
                      <ShieldOff className="size-5" />
                    </div>
                    <span className="text-sm font-semibold text-ink-soft">2FA no configurado</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={startSetup} className="w-full sm:w-auto">
                    Activar 2FA
                  </Button>
                </div>
              )}
              {error && (
                <p className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-[12.5px] font-semibold text-danger">
                  {error}
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {/* TAB: PREFERENCIAS */}
        {activeTab === 'preferencias' && (
          <div className="lg:col-span-2 space-y-6 max-w-2xl">
            <Card>
              <CardHeader title="Notificaciones" description="Controlá qué avisos querés recibir" />
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-line bg-surface-alt">
                  <div>
                    <p className="text-sm font-bold text-ink">Alertas de Rentabilidad</p>
                    <p className="text-[12px] text-ink-soft mt-0.5">Recibir un email cuando la rentabilidad de un cliente baje de su objetivo.</p>
                  </div>
                  <input type="checkbox" className="toggle-checkbox" defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl border border-line bg-surface-alt">
                  <div>
                    <p className="text-sm font-bold text-ink">Nuevos comprobantes</p>
                    <p className="text-[12px] text-ink-soft mt-0.5">Recibir un aviso en la app cuando un operario suba una nueva factura.</p>
                  </div>
                  <input type="checkbox" className="toggle-checkbox" defaultChecked />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Apariencia" description="Personalizá cómo se ve CosteAR" />
              <CardBody className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <button className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-granate bg-white text-granate shadow-sm">
                    <span className="text-sm font-bold mb-1">Claro</span>
                    <span className="text-[10px] text-ink-soft">Por defecto</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-transparent bg-zinc-900 text-zinc-300 opacity-50 cursor-not-allowed">
                    <span className="text-sm font-bold mb-1">Oscuro</span>
                    <span className="text-[10px] text-zinc-500">Próximamente</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-transparent bg-zinc-100 text-zinc-500 opacity-50 cursor-not-allowed">
                    <span className="text-sm font-bold mb-1">Sistema</span>
                    <span className="text-[10px] text-zinc-400">Próximamente</span>
                  </button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* TAB: PERSONALIZACION */}
        {activeTab === 'personalizacion' && (
          <Card className="lg:col-span-2 max-w-2xl">
            <CardHeader title="Marca Personal" description="Personalizá los reportes que enviás a tus clientes" />
            <CardBody className="space-y-6">
              <div className="p-5 rounded-2xl border border-dashed border-line bg-zinc-50/50 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-granate/10 text-granate mb-3">
                  <PaletteIcon className="size-6" />
                </div>
                <h3 className="text-sm font-bold text-ink">Logo de tu Estudio</h3>
                <p className="mt-1 text-[12px] text-ink-soft max-w-sm mx-auto mb-4">
                  Subí el logo de tu estudio para que los PDF del "Reporte para el Cliente" salgan con tu marca en lugar del logo de CosteAR.
                </p>
                <Button size="sm" variant="secondary" className="opacity-70 cursor-not-allowed">Subir Logo (Próximamente)</Button>
              </div>

              <div className="p-5 rounded-2xl border border-dashed border-line bg-zinc-50/50 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
                  <Settings className="size-6" />
                </div>
                <h3 className="text-sm font-bold text-ink">Firma Digital</h3>
                <p className="mt-1 text-[12px] text-ink-soft max-w-sm mx-auto mb-4">
                  Cargá tu firma para que se adjunte automáticamente al pie de página de los informes técnicos.
                </p>
                <Button size="sm" variant="secondary" className="opacity-70 cursor-not-allowed">Configurar Firma (Próximamente)</Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          saving={uploadingAvatar}
          onCancel={() => setCropSrc(null)}
          onSave={handleSaveAvatar}
        />
      )}
    </AppShell>
  );
}
