import { useEffect, useState, useRef } from 'react';
import { toMaterialsList, type RawMaterialConfig, type RawMaterialSection } from './cost-structure-types';
import { MaterialDetailForm } from './components/raw-materials/MaterialDetailForm';
import { RawMaterialsList } from './components/raw-materials/RawMaterialsList';
import { emptyRawMaterial } from './components/raw-materials/helpers';

interface WrapperProps {
  structureId: string;
  period?: string;
  defaultValues?: unknown;
  onSave: (data: RawMaterialSection) => Promise<void>;
  saving: boolean;
  isProcesses?: boolean;
}

export function RawMaterialForm({ structureId, period, defaultValues, onSave, saving, isProcesses }: WrapperProps) {
  const [materials, setMaterials] = useState<RawMaterialConfig[]>(() => toMaterialsList(defaultValues));
  const [selected, setSelected] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<number | null>(null);

  const syncRef = useRef<string | null>(null);
  useEffect(() => {
    const snap = JSON.stringify(defaultValues ?? null);
    if (snap === syncRef.current) return;
    syncRef.current = snap;
    setMaterials(toMaterialsList(defaultValues));
  }, [defaultValues]);

  async function persist(next: RawMaterialConfig[]) {
    setMaterials(next);
    await onSave({ materials: next });
  }

  async function saveMaterial(index: number, mat: RawMaterialConfig) {
    const next = materials.map((m, i) => (i === index ? mat : m));
    if (index >= materials.length) next.push(mat);
    await persist(next);
  }

  function addMaterial() {
    const mat = emptyRawMaterial();
    mat.id = crypto.randomUUID();
    mat.name = '';
    setMaterials((ms) => [...ms, mat]);
    setSelected(materials.length);
  }

  if (selected !== null && materials[selected]) {
    return (
      <MaterialDetailForm
        key={materials[selected].id ?? selected}
        structureId={structureId}
        period={period}
        index={selected}
        material={materials[selected]}
        saving={saving}
        isProcesses={isProcesses}
        onBack={() => setSelected(null)}
        onSaveMaterial={async (mat) => { await saveMaterial(selected, mat); }}
      />
    );
  }

  return (
    <RawMaterialsList
      structureId={structureId}
      materials={materials}
      saving={saving}
      toDelete={toDelete}
      setToDelete={setToDelete}
      setSelected={setSelected}
      addMaterial={addMaterial}
      onConfirmDelete={async () => {
        if (toDelete === null) return;
        const next = materials.filter((_, i) => i !== toDelete);
        setToDelete(null);
        await persist(next);
      }}
    />
  );
}

export * from './components/raw-materials/helpers';
