import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Building2, CheckCircle2, ArrowLeft, Upload } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api, apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CosteARLogo } from '@/components/layout/CosteARLogo';

// Import modular components
import { SidebarDock } from './components/SidebarDock';
import { CompanyStructuresList, type PortalStructure } from './components/StructureSelector';
import { ChatTimeline, Submission } from './components/ChatTimeline';
import { ChatComposer } from './components/ChatComposer';
import { SubmissionGrid } from './components/SubmissionGrid';
import { MetricsDashboard } from './components/MetricsDashboard';

// ── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  connectionId: string;
  connection: {
    id: string;
    company: { id: string; name: string; industry: string | null };
    costist?: { id: string; name: string } | null;
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string).split(',')[1]) ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Main component ───────────────────────────────────────────────────────────

export function EmpresaPortalPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  // Tab activa del menú del operador: chat, feed (list), metrics, o invite (unirse)
  const [activeTab, setActiveTab] = useState<'chat' | 'feed' | 'metrics' | 'invite'>('chat');

  // Empresa y estructura activa
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [activeStructureId, setActiveStructureId] = useState<string | null>(null);
  const [activeStructureName, setActiveStructureName] = useState<string | null>(null);

  // Formulario de Carga
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Código de invitación
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['my-companies'],
    queryFn: async () => {
      const res = await api.get<{ data: Company[] }>('/empresa-portal/my-companies');
      return res.data.data;
    },
  });

  const { data: submissions = [], isLoading: isLoadingSubmissions } = useQuery<Submission[]>({
    queryKey: ['my-submissions', activeConnectionId, activeStructureId],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (activeConnectionId) qs.set('connectionId', activeConnectionId);
      if (activeStructureId) qs.set('costStructureId', activeStructureId);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const res = await api.get<{ data: Submission[] }>(`/empresa-portal/my-submissions${suffix}`);
      return res.data.data;
    },
    refetchInterval: 15_000,
  });

  // Elegir primera empresa automáticamente
  useEffect(() => {
    if (companies.length === 1 && !activeConnectionId) {
      setActiveConnectionId(companies[0]!.connectionId);
    }
    if (companies.length > 1 && !activeConnectionId) {
      setShowCompanyPicker(true);
    }
  }, [companies, activeConnectionId]);

  // Scroll automático en el chat al cargar o recibir mensajes
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [submissions, activeTab]);

  const activeCompany = companies.find((c) => c.connectionId === activeConnectionId);

  // Misma query key que CompanyStructuresList (sidebar) y StructureSelectDropdown
  // (el "Imputar a" del composer) — comparten cache, no hace falta un fetch propio.
  const { data: activeStructures = [] } = useQuery<PortalStructure[]>({
    queryKey: ['portal-structures', activeConnectionId],
    enabled: false,
  });

  // ── Accept invite ──────────────────────────────────────────────────────────

  const acceptInvite = useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post<{ data: { companyName: string } }>('/empresa-portal/accept-invite', { code });
      return res.data.data;
    },
    onSuccess: (data) => {
      setInviteSuccess(`¡Listo! Ahora sos operador de ${data.companyName}.`);
      setInviteCode('');
      setInviteError(null);
      qc.invalidateQueries({ queryKey: ['my-companies'] });
      setTimeout(() => {
        setInviteSuccess(null);
        setActiveTab('chat');
      }, 2000);
    },
    onError: (e) => setInviteError(apiErrorMessage(e)),
  });

  // ── Send document ───────────────────────────────────────────────────────────

  const handleSend = async () => {
    if ((!text.trim() && !file) || sending) return;
    if (!activeConnectionId) {
      setSendError('Seleccioná una empresa primero.');
      return;
    }
    // Con un solo producto activo no hace falta elegir (no hay ambigüedad
    // posible). Con más de uno, mandar sin "Imputar a" deja el comprobante sin
    // atribuir y el costista tiene que adivinar a qué producto pertenece.
    if (activeStructures.length > 1 && !activeStructureId) {
      setSendError('Elegí a qué producto imputar este envío (abajo, "Imputar a").');
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      let fileData: string | undefined;
      let fileMimeType: string | undefined;
      let fileName: string | undefined;
      let sourceType: 'TEXT' | 'PDF' | 'IMAGE' = 'TEXT';

      if (file) {
        fileData = await fileToBase64(file);
        fileMimeType = file.type;
        fileName = file.name;
        sourceType = file.type.startsWith('image/') ? 'IMAGE' : 'PDF';
      }

      await api.post('/empresa-portal/submit', {
        rawContent: text,
        sourceType,
        connectionId: activeConnectionId ?? undefined,
        costStructureId: activeStructureId ?? undefined,
        fileName,
        fileData,
        fileMimeType,
      });

      setText('');
      setFile(null);
      setSendError(null);
      qc.invalidateQueries({ queryKey: ['my-submissions', activeConnectionId, activeStructureId] });
    } catch (e) {
      setSendError(apiErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  // ── Pantalla de bienvenida cuando no hay empresas activas ────────────────────

  if (companies.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-granate-tenue/50 to-surface-alt px-4 font-sans relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-full h-64 bg-granate/5 rounded-b-[100%] blur-3xl -translate-y-1/2" />
        
        <div className="w-full max-w-sm relative z-10">
          {/* Volver atrás */}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mb-6 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-ink-soft hover:text-granate transition-colors bg-white/50 backdrop-blur px-3 py-1.5 rounded-full border border-line w-fit"
          >
            <ArrowLeft className="size-3.5" /> Volver
          </button>

          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white text-granate shadow-[0_8px_30px_rgba(74,21,27,0.12)] border border-granate/10">
              <CosteARLogo className="h-7 w-auto text-granate" />
            </div>
            <span className="text-2xl font-black tracking-tight text-granate font-outfit">CosteAR</span>
          </div>

          {/* Card */}
          <Card className="p-8 shadow-[0_20px_60px_rgba(0,0,0,0.06)] border-line/50 bg-white/80 backdrop-blur-md rounded-2xl">
            <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-granate text-white shadow-lg shadow-granate/20">
              <Upload className="size-5" />
            </div>

            <h1 className="mb-2 text-xl font-black tracking-tight text-ink font-outfit">Hola, {user?.name?.split(' ')[0] ?? 'operador'}</h1>
            <p className="mb-8 text-[13px] text-ink-soft leading-relaxed font-medium">
              Tu cuenta de operador está lista. Ingresá el código de invitación de tu costista para vincular tu empresa.
            </p>

            {inviteSuccess ? (
              <div className="rounded-2xl border border-ok/20 bg-ok/10 px-4 py-3">
                <p className="text-[13px] font-semibold text-ok">✅ {inviteSuccess}</p>
                <p className="mt-1 text-[12px] text-ok/80">Cargando tus accesos…</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Input
                  label="Código de vinculación"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setInviteError(null); }}
                  placeholder="Ej: METAL-A3F2B1"
                  error={inviteError ?? undefined}
                  className="font-mono tracking-widest text-center text-lg h-14 bg-surface-alt border-line focus:border-granate focus:ring-granate/20 rounded-xl"
                />
                <Button
                  onClick={() => acceptInvite.mutate(inviteCode.trim())}
                  disabled={inviteCode.trim().length < 5 || acceptInvite.isPending}
                  loading={acceptInvite.isPending}
                  className="w-full h-12 rounded-xl bg-granate hover:bg-granate-deep text-white text-[13px] shadow-lg shadow-granate/20 hover:shadow-xl transition-all font-bold"
                >
                  Vincularme ahora
                </Button>
                <p className="text-center text-[11.5px] text-ink-soft/80 font-medium">
                  ¿No tenés un código? Solicitáselo al costista a cargo.
                </p>
              </div>
            )}
          </Card>

          {/* Logout */}
          <button
            onClick={() => { useAuthStore.getState().clear(); window.location.href = '/login'; }}
            className="mt-6 w-full text-center text-xs font-semibold text-ink-soft/60 hover:text-granate transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // ── Render Principal (Con el Dock Premium del Costista) ─────────────────────

  return (
    <div className="flex h-screen bg-surface-alt font-sans relative overflow-hidden">
      {/* 1. DOCK VERTICAL FLOTANTE (Idéntico visualmente al del Costista) */}
      <SidebarDock activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. BARRA DE NAVEGACIÓN FLOTANTE EN MOBILE */}
      <nav className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-30 grid grid-cols-3 gap-1 rounded-2xl bg-granate p-2 shadow-[0_16px_40px_rgba(74,21,27,0.18)] lg:hidden">
        {[
          { id: 'chat' as const, label: 'Charla IA' },
          { id: 'feed' as const, label: 'Envíos' },
          { id: 'invite' as const, label: 'Vincular' },
        ].map(({ id, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-all rounded-2xl text-white/60',
                active && 'bg-surface-alt text-granate'
              )}
            >
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. CONTENEDOR PRINCIPAL CON LAYOUT DE DOS COLUMNAS (Estilo Costista) */}
      <div className="flex-1 flex flex-col lg:pl-[104px] h-screen overflow-hidden">
        
        {/* Header Principal con la Tarjetita de Contexto Estilo Costista */}
        <header className="h-16 shrink-0 border-b border-line bg-surface/80 backdrop-blur-md px-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-granate-deep bg-granate-tenue px-3 py-1.5 rounded-full border border-granate/10 shadow-sm">
              Panel Operario
            </span>
            <div className="h-4 w-px bg-line hidden sm:block" />
            <span className="text-xs font-bold text-ink hidden sm:inline-block">
              {activeCompany ? activeCompany.connection.company.name : 'Seleccioná una empresa'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {companies.length > 1 && (
              <button 
                onClick={() => setShowCompanyPicker(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-surface-alt/50 hover:bg-surface-alt text-xs font-bold text-ink-soft hover:text-ink transition-colors shadow-sm"
              >
                <Building2 className="size-3.5" /> Cambiar empresa
              </button>
            )}
            {/* Tarjetita del perfil del costista / operario */}
            <div className="hidden items-center gap-2.5 rounded-full border border-line bg-surface px-3 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] lg:flex cursor-default hover:border-granate/30 transition-colors">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-granate text-[11px] font-black text-white shadow-inner">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </span>
              <div className="text-left leading-none pr-2">
                <p className="text-[12px] font-extrabold text-ink tracking-tight">{user?.name ?? 'Usuario'}</p>
                <p className="text-[9px] text-ink-soft mt-0.5 font-bold uppercase tracking-wider">Operador</p>
              </div>
            </div>
          </div>
        </header>

        {/* Zona de Trabajo */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* A. Selector Lateral de Productos/Estructuras */}
          <aside className="hidden md:block w-64 border-r border-line bg-surface overflow-y-auto p-4 shrink-0">
            <p className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-widest text-ink-soft/60">Estructuras / Meses</p>
            {activeConnectionId ? (
              <CompanyStructuresList
                connectionId={activeConnectionId}
                activeStructureId={activeStructureId}
                onSelectStructure={(id, name) => {
                  setActiveStructureId(id);
                  setActiveStructureName(name);
                }}
                onClearStructure={() => {
                  setActiveStructureId(null);
                  setActiveStructureName(null);
                }}
              />
            ) : (
              <p className="text-xs text-ink-soft px-2 py-3">Seleccioná una empresa para ver sus productos.</p>
            )}
          </aside>

          {/* B. Área de Contenido Principal */}
          <main className="flex-1 flex flex-col min-w-0 bg-surface-alt relative">
            
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <ChatTimeline
                  submissions={submissions}
                  activeStructureName={activeStructureName}
                  costistName={activeCompany?.connection.costist?.name ?? 'Soporte'}
                  chatBottomRef={chatBottomRef}
                  sending={sending}
                />
                <ChatComposer
                  text={text}
                  setText={setText}
                  file={file}
                  setFile={setFile}
                  fileError={fileError}
                  setFileError={setFileError}
                  sendError={sendError}
                  sending={sending}
                  activeConnectionId={activeConnectionId}
                  activeStructureId={activeStructureId}
                  onSelectStructure={(id, name) => {
                    setActiveStructureId(id);
                    setActiveStructureName(name);
                  }}
                  onSend={handleSend}
                />
              </div>
            )}

            {activeTab === 'feed' && (
              <SubmissionGrid
                submissions={submissions}
                isLoadingSubmissions={isLoadingSubmissions}
                activeStructureName={activeStructureName}
                onNavigateToChat={() => setActiveTab('chat')}
              />
            )}

          {/* TAB: MÉTRICAS */}
          {activeTab === 'metrics' && (
            <div className="flex flex-1 overflow-y-auto bg-surface relative z-10 w-full h-full pb-20">
              <div className="w-full">
                <MetricsDashboard 
                  activeConnectionId={activeConnectionId} 
                  activeStructureId={activeStructureId} 
                />
              </div>
            </div>
          )}

            {activeTab === 'invite' && (
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-28 lg:pb-8">
                <div className="max-w-md mx-auto space-y-6 mt-6">
                  <div className="border-b border-line pb-3">
                    <h2 className="text-base font-extrabold text-granate-deep font-outfit">Vincularme a una nueva empresa</h2>
                    <p className="text-xs text-ink-soft">Unite a otra empresa ingresando el código enviado por tu costista.</p>
                  </div>

                  <Card className="p-6">
                    <CardBody className="p-0 space-y-4">
                      <p className="text-xs text-ink-soft leading-relaxed">
                        Si prestás servicios como operador de carga para múltiples PyMEs, podés ingresar códigos de vinculación adicionales para unificarlos en tu cuenta.
                      </p>

                      {inviteSuccess ? (
                        <div className="rounded-2xl border border-ok/20 bg-ok/10 px-4 py-3 text-center">
                          <CheckCircle2 className="mx-auto size-8 text-ok animate-bounce mb-1" />
                          <p className="text-sm font-semibold text-ok">{inviteSuccess}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Input
                            label="Código de invitación"
                            value={inviteCode}
                            onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setInviteError(null); }}
                            placeholder="Ej: METAL-A3F2B1"
                            error={inviteError ?? undefined}
                            className="font-mono tracking-wide"
                          />
                          <Button
                            onClick={() => acceptInvite.mutate(inviteCode.trim())}
                            disabled={inviteCode.trim().length < 5 || acceptInvite.isPending}
                            loading={acceptInvite.isPending}
                            className="w-full py-3"
                          >
                            Unirme a la empresa
                          </Button>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 4. MODAL SELECTOR DE EMPRESAS */}
      {showCompanyPicker && companies.length > 1 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-line animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5 px-1">
              <h2 className="text-lg font-black tracking-tight text-ink font-outfit">Cambiar de Empresa</h2>
              <button type="button" onClick={() => setShowCompanyPicker(false)} className="text-ink-soft hover:text-ink bg-surface-alt p-1.5 rounded-full transition-colors">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-hidden pb-2">
              {companies.map((c) => (
                <button
                  key={c.connectionId}
                  type="button"
                  onClick={() => {
                    setActiveConnectionId(c.connectionId);
                    setShowCompanyPicker(false);
                    setActiveStructureId(null);
                    setActiveStructureName(null);
                  }}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-line bg-surface-alt px-4 py-3.5 text-left hover:border-granate/30 hover:bg-white hover:shadow-md transition-all duration-300"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white border border-line shadow-sm group-hover:bg-granate-tenue group-hover:text-granate transition-colors">
                    <Building2 className="size-5 text-ink-soft group-hover:text-granate transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-ink truncate group-hover:text-granate transition-colors">{c.connection.company.name}</p>
                    {c.connection.company.industry && (
                      <p className="text-[11px] font-semibold text-ink-soft truncate uppercase tracking-wide mt-0.5">{c.connection.company.industry}</p>
                    )}
                  </div>
                  <div className="size-2 rounded-full bg-granate opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
