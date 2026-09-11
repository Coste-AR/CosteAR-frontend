// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCroppedImage } from './crop-image';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('recorte de avatar', () => {
  it('dibuja sólo el área elegida y devuelve el JPEG sin prefijo data URL', async () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,avatar-recortado');

    class LoadedImage {
      private onLoad?: () => void;
      addEventListener(event: string, listener: () => void) {
        if (event === 'load') this.onLoad = listener;
      }
      set src(_value: string) {
        queueMicrotask(() => this.onLoad?.());
      }
    }
    vi.stubGlobal('Image', LoadedImage);

    const result = await getCroppedImage(
      'data:image/png;base64,original',
      { x: 10, y: 20, width: 80, height: 60 },
      256,
    );

    expect(drawImage).toHaveBeenCalledWith(
      expect.any(LoadedImage),
      10, 20, 80, 60,
      0, 0, 256, 256,
    );
    expect(result).toEqual({ imageData: 'avatar-recortado', mimeType: 'image/jpeg' });
  });
});
