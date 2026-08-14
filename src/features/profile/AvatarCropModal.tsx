import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/Button';
import { PortalOverlay } from '@/components/ui/PortalOverlay';
import { getCroppedImage, type Area } from './crop-image';

interface Props {
  imageSrc: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (data: { imageData: string; mimeType: string }) => void;
}

/** Modal para recortar (cuadrado, con zoom) la foto de perfil antes de subirla. */
export function AvatarCropModal({ imageSrc, saving, onCancel, onSave }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onComplete = useCallback((_area: Area, pixels: Area) => setAreaPixels(pixels), []);

  const handleSave = async () => {
    if (!areaPixels) return;
    setError(null);
    try {
      const cropped = await getCroppedImage(imageSrc, areaPixels);
      onSave(cropped);
    } catch {
      setError('No se pudo recortar la imagen. Probá con otra.');
    }
  };

  return (
    <PortalOverlay>
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/40 backdrop-blur-sm px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-[0_24px_60px_rgba(74,21,27,0.18)] sm:rounded-2xl sm:p-7">
        <h3 className="mb-4 text-[13px] font-extrabold uppercase tracking-wider text-granate-deep sm:mb-5">Recortá tu foto</h3>
        <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-line bg-zinc-900 sm:h-64">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onComplete}
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-granate"
          />
        </div>
        {error && (
          <p className="mt-4 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-[12.5px] font-semibold text-danger">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:mt-6 sm:flex-row sm:justify-end sm:pt-5">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving} className="w-full sm:w-auto">Cancelar</Button>
          <Button size="sm" onClick={handleSave} loading={saving} className="w-full sm:w-auto">Guardar foto</Button>
        </div>
      </div>
    </div>
    </PortalOverlay>
  );
}
