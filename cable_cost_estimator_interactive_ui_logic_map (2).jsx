import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Download, TestTube } from "lucide-react";

/**
 * Cable Cost Estimator — Revamped (Fix)
 *
 * ✅ Fix principal: corregido el "Unterminated string constant" reemplazando .join("\n") en exportCSV.
 * ✅ Mejoras: generador de IDs con fallback, y panel de "Dev Tests" con casos de prueba visibles.
 *
 * Flujo reflejado del Excel:
 *  Entrada de Datos -> Base de Datos -> Precios -> Tablas/Factores -> Resultado
 *
 * Entradas principales:
 *  - metal, fases, tipología (uni/tri), sección (mm²), tensión
 *  - vaina (RH/RH+UV/PVC), pantalla (mm²), armadura, WB longitudinal/radial
 *  - precios Cu/Al (u$s/kg), vaina base (u$s/kg), WB (u$s/m), armadura (u$s/kg)
 *  - mermas %, indirectos y MO (u$s/m), margen %, TC ARS
 *
 * Cálculos:
 *  - kg/m conductor = sección(mm²)·1e-6·densidad(metal)·fases
 *  - kg/m pantalla  = pantalla(mm²)·1e-6·densidad(Cu)·fases
 *  - vaina $/kg = precio_base_vaina × multiplicador (RH/RH+UV/PVC)
 *  - Materiales USD/m = Σ(kg/m·$/kg) + Σ(m·$/m)
 *  - Costo fábrica = Materiales + Mermas% + Procesos (MO + Indirectos)
 *  - Precio lista = Costo fábrica × (1 + Margen%) → USD/m y ARS/m
 */

// --- Tipos ---
type Metal = "Cobre" | "Aluminio";

type ComponentRow = {
  id: string;
  nombre: string;             // Conductor, Pantalla, Vaina, WB Longitudinal, etc.
  tipoPrecio: "$/kg" | "$/m";  // base de precio
  precio: number;             // precio por unidad segun tipoPrecio
  kgPorMetro: number;         // sólo si $/kg
  metros: number;             // sólo si $/m
  incluye?: boolean;          // on/off
  categoria?: "Materia" | "Proceso"; // para desglose
};

// --- Utilidades base ---
const uid = () => (typeof crypto !== "undefined" && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2));

const DENSIDAD_KG_M3 = { Cobre: 8890, Aluminio: 2703 } as const;

const DEFAULT_PRECIOS = {
  Cobre_kg: 7.21091,
  Aluminio_kg: 2.973,
  WB_Longitudinal_m: 1.16,
  WB_Radial_m: 2.21,
  VainaBase_kg: 1.38, // PVC base
};

const SHEATH_MULTIPLIERS = [
  { key: "RH", label: "RH", factor: 1.30 },
  { key: "RH_UV", label: "RH + UV", factor: 1.49 },
  { key: "PVC", label: "PVC Normal", factor: 1.43 },
] as const;

const SECCIONES = [25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
const TENSIONES = ["3.3 kV", "6.6 kV", "13.2 kV", "33 kV"]; // ejemplo
const PANTALLA_MM2 = [0, 6, 10, 16];
const FACTOR_TIPOL = { unipolar: 1.0, tripolar: 1.05 } as const;

function kgConductorPorMetro(seccionMM2: number, metal: Metal, fases: number) {
  return seccionMM2 * 1e-6 * DENSIDAD_KG_M3[metal] * fases;
}
function kgPantallaPorMetro(pantallaMM2: number, fases: number) {
  if (!pantallaMM2) return 0;
  return pantallaMM2 * 1e-6 * DENSIDAD_KG_M3.Cobre * fases;
}
function formatUSD(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(n || 0);
}
function round(n: number, d = 6) { return Math.round((n + Number.EPSILON) * 10 ** d) / 10 ** d; }

// --- Función pura de coste para casos de prueba/dev ---
export type CostParams = {
  metal: Metal; fases: number; tipologia: "unipolar" | "tripolar"; seccion: number; tension: string;
  sheathKey: string; pantallaMM2: number; armadura: boolean; useWBLong: boolean; useWBRad: boolean;
  pxCu: number; pxAl: number; pxWBLong: number; pxWBRad: number; pxVainaBase: number; pxArmaduraKg: number;
  kgmArmadura: number; mermasPct: number; indirectosUSDm: number; moUSDm: number; margenPct: number; tcARS: number;
};
export function computeCost(p: CostParams) {
  const kgmConductor = kgConductorPorMetro(p.seccion, p.metal, p.fases);
  const kgmPant = kgPantallaPorMetro(p.pantallaMM2, p.fases);
  const kgmVainaBase = 0.12 * FACTOR_TIPOL[p.tipologia];
  const vainaFactor = SHEATH_MULTIPLIERS.find(s => s.key === p.sheathKey)?.factor ?? 1;
  const pxVaina = p.pxVainaBase * vainaFactor;

  const materias: ComponentRow[] = [
    { id: "conductor", nombre: `Conductor ${p.metal}` , tipoPrecio: "$/kg", precio: p.metal === "Cobre" ? p.pxCu : p.pxAl, kgPorMetro: kgmConductor, metros: 1, incluye: true, categoria: "Materia" },
    { id: "pantalla", nombre: p.pantallaMM2 ? `Pantalla Cu ${p.pantallaMM2} mm²` : "Pantalla (N/A)", tipoPrecio: "$/kg", precio: p.pxCu, kgPorMetro: kgmPant, metros: 1, incluye: p.pantallaMM2 > 0, categoria: "Materia" },
    { id: "vaina", nombre: `Vaina ${SHEATH_MULTIPLIERS.find(s=>s.key===p.sheathKey)?.label}`, tipoPrecio: "$/kg", precio: pxVaina, kgPorMetro: kgmVainaBase, metros: 1, incluye: true, categoria: "Materia" },
    { id: "wbL", nombre: "WB Longitudinal", tipoPrecio: "$/m", precio: p.pxWBLong, kgPorMetro: 0, metros: 1, incluye: p.useWBLong, categoria: "Materia" },
    { id: "wbR", nombre: "WB Radial", tipoPrecio: "$/m", precio: p.pxWBRad, kgPorMetro: 0, metros: 1, incluye: p.useWBRad, categoria: "Materia" },
    { id: "arm", nombre: "Armadura", tipoPrecio: "$/kg", precio: p.pxArmaduraKg, kgPorMetro: p.armadura ? p.kgmArmadura : 0, metros: 1, incluye: p.armadura, categoria: "Materia" },
  ];
  const procesos: ComponentRow[] = [
    { id: "mo", nombre: "Mano de Obra", tipoPrecio: "$/m", precio: p.moUSDm, kgPorMetro: 0, metros: 1, incluye: true, categoria: "Proceso" },
    { id: "ind", nombre: "Indirectos / Energía", tipoPrecio: "$/m", precio: p.indirectosUSDm, kgPorMetro: 0, metros: 1, incluye: true, categoria: "Proceso" },
  ];
  const filas = [...materias, ...procesos];
  const subtotalMaterias = filas.filter(f=>f.categoria==="Materia" && f.incluye).reduce((acc, f)=>acc + (f.tipoPrecio==="$/kg"? f.kgPorMetro*f.precio : f.metros*f.precio), 0);
  const mermasUSDm = subtotalMaterias * (p.mermasPct/100);
  const subtotalProcesos = filas.filter(f=>f.categoria==="Proceso" && f.incluye).reduce((acc, f)=>acc + (f.tipoPrecio==="$/kg"? f.kgPorMetro*f.precio : f.metros*f.precio), 0);
  const costoFabrica = subtotalMaterias + mermasUSDm + subtotalProcesos;
  const precioListaUSDm = costoFabrica * (1 + p.margenPct/100);
  const precioListaARSm = precioListaUSDm * p.tcARS;
  return { subtotalMaterias, mermasUSDm, subtotalProcesos, costoFabrica, precioListaUSDm, precioListaARSm };
}

export default function CableCostEstimator() {
  // --- Entrada de datos ---
  const [metal, setMetal] = useState<Metal>("Cobre");
  const [fases, setFases] = useState<number>(1); // 1=unipolar, 3=tripolar (a efectos de peso)
  const [tipologia, setTipologia] = useState<"unipolar"|"tripolar">("unipolar");
  const [seccion, setSeccion] = useState<number>(95);
  const [tension, setTension] = useState<string>("13.2 kV");
  const [sheathKey, setSheathKey] = useState<string>("RH");
  const [pantallaMM2, setPantallaMM2] = useState<number>(6);
  const [armadura, setArmadura] = useState<boolean>(false);

  // --- Precios editables ---
  const [pxCu, setPxCu] = useState<number>(DEFAULT_PRECIOS.Cobre_kg);
  const [pxAl, setPxAl] = useState<number>(DEFAULT_PRECIOS.Aluminio_kg);
  const [pxWBLong, setPxWBLong] = useState<number>(DEFAULT_PRECIOS.WB_Longitudinal_m);
  const [pxWBRad, setPxWBRad] = useState<number>(DEFAULT_PRECIOS.WB_Radial_m);
  const [pxVainaBase, setPxVainaBase] = useState<number>(DEFAULT_PRECIOS.VainaBase_kg);

  // --- Overheads / mermas / margen ---
  const [mermasPct, setMermasPct] = useState<number>(3);
  const [indirectosUSDm, setIndirectosUSDm] = useState<number>(0.12);
  const [moUSDm, setMoUSDm] = useState<number>(0.20);
  const [margenPct, setMargenPct] = useState<number>(15);
  const [tcARS, setTcARS] = useState<number>(1100);

  // --- Componentes derivados de la especificación (Base de Datos lógica) ---
  const kgmConductor = useMemo(() => kgConductorPorMetro(seccion, metal, fases), [seccion, metal, fases]);
  const kgmPantalla = useMemo(() => kgPantallaPorMetro(pantallaMM2, fases), [pantallaMM2, fases]);
  const kgmVainaBase = 0.12 * FACTOR_TIPOL[tipologia];
  const vainaFactor = SHEATH_MULTIPLIERS.find(s => s.key === sheathKey)?.factor ?? 1;
  const pxVaina = pxVainaBase * vainaFactor;

  const [pxArmaduraKg, setPxArmaduraKg] = useState<number>(1.9);
  const [kgmArmadura, setKgmArmadura] = useState<number>(0.15);

  const [useWBLong, setUseWBLong] = useState<boolean>(false);
  const [useWBRad, setUseWBRad] = useState<boolean>(false);

  const materias: ComponentRow[] = [
    { id: "conductor", nombre: `Conductor ${metal}`, tipoPrecio: "$/kg", precio: metal === "Cobre" ? pxCu : pxAl, kgPorMetro: kgmConductor, metros: 1, incluye: true, categoria: "Materia" },
    { id: "pantalla", nombre: pantallaMM2 ? `Pantalla Cu ${pantallaMM2} mm²` : "Pantalla (N/A)", tipoPrecio: "$/kg", precio: pxCu, kgPorMetro: kgmPantalla, metros: 1, incluye: pantallaMM2>0, categoria: "Materia" },
    { id: "vaina", nombre: `Vaina ${SHEATH_MULTIPLIERS.find(s=>s.key===sheathKey)?.label}`, tipoPrecio: "$/kg", precio: pxVaina, kgPorMetro: kgmVainaBase, metros: 1, incluye: true, categoria: "Materia" },
    { id: "wbL", nombre: "WB Longitudinal", tipoPrecio: "$/m", precio: pxWBLong, kgPorMetro: 0, metros: 1, incluye: useWBLong, categoria: "Materia" },
    { id: "wbR", nombre: "WB Radial", tipoPrecio: "$/m", precio: pxWBRad, kgPorMetro: 0, metros: 1, incluye: useWBRad, categoria: "Materia" },
    { id: "arm", nombre: "Armadura", tipoPrecio: "$/kg", precio: pxArmaduraKg, kgPorMetro: armadura ? kgmArmadura : 0, metros: 1, incluye: armadura, categoria: "Materia" },
  ];

  const procesos: ComponentRow[] = [
    { id: "mo", nombre: "Mano de Obra", tipoPrecio: "$/m", precio: moUSDm, kgPorMetro: 0, metros: 1, incluye: true, categoria: "Proceso" },
    { id: "ind", nombre: "Indirectos / Energía", tipoPrecio: "$/m", precio: indirectosUSDm, kgPorMetro: 0, metros: 1, incluye: true, categoria: "Proceso" },
  ];

  const [extras, setExtras] = useState<ComponentRow[]>([]);
  function addExtraRow() { setExtras(prev => ([ ...prev, { id: uid(), nombre: "Extra", tipoPrecio: "$/kg", precio: 1, kgPorMetro: 0, metros: 1, incluye: true, categoria: "Materia" } ])); }
  function removeExtraRow(id: string) { setExtras(prev => prev.filter(x => x.id !== id)); }

  const filas = useMemo(() => ([...materias, ...procesos, ...extras]), [materias, procesos, extras]);

  const subtotalMaterias = useMemo(() => filas.filter(f=>f.categoria==="Materia" && f.incluye)
    .reduce((acc, f) => acc + (f.tipoPrecio === "$/kg" ? f.kgPorMetro * f.precio : f.metros * f.precio), 0), [filas]);

  const mermasUSDm = useMemo(() => subtotalMaterias * (mermasPct/100), [subtotalMaterias, mermasPct]);

  const subtotalProcesos = useMemo(() => filas.filter(f=>f.categoria==="Proceso" && f.incluye)
    .reduce((acc, f) => acc + (f.tipoPrecio === "$/kg" ? f.kgPorMetro * f.precio : f.metros * f.precio), 0), [filas]);

  const costoFabrica = useMemo(() => subtotalMaterias + mermasUSDm + subtotalProcesos, [subtotalMaterias, mermasUSDm, subtotalProcesos]);
  const precioListaUSDm = useMemo(() => costoFabrica * (1 + margenPct/100), [costoFabrica, margenPct]);
  const precioListaARSm = useMemo(() => precioListaUSDm * tcARS, [precioListaUSDm, tcARS]);

  // Export CSV (✅ fix: usar "\n")
  function exportCSV() {
    const header = ["Categoria","Componente","TipoPrecio","Precio","kg/m","m","Incluye","Costo(m)"];
    const rows = filas.map(f => {
      const costo = !f.incluye ? 0 : (f.tipoPrecio === "$/kg" ? f.kgPorMetro * f.precio : f.metros * f.precio);
      return [f.categoria, f.nombre, f.tipoPrecio, round(f.precio), round(f.kgPorMetro), round(f.metros), f.incluye?"SI":"NO", round(costo)];
    });
    const resumen = [
      ["SUBTOTAL MATERIALES","", "", round(subtotalMaterias)],
      ["MERMAS %", mermasPct+"%", "", round(mermasUSDm)],
      ["SUBTOTAL PROCESOS","", "", round(subtotalProcesos)],
      ["COSTO FÁBRICA (USD/m)","", "", round(costoFabrica)],
      ["MARGEN %", margenPct+"%", "", ""],
      ["PRECIO LISTA (USD/m)","", "", round(precioListaUSDm)],
      ["TC ARS","", "", tcARS],
      ["PRECIO LISTA (ARS/m)","", "", round(precioListaARSm)],
    ];
    const csv = [header, ...rows, [], ...resumen].map(r => (Array.isArray(r)? r.join(","): r)).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "estimacion_cable.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen w-full p-6 md:p-10 bg-slate-50">
      {/* Título */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Cable Cost Estimator</h1>
        <p className="text-slate-600 mt-2">Extrae la lógica del Excel y calcula costo por metro con desglose, mermas, indirectos y margen.</p>
      </div>

      {/* Mapa de lógica */}
      <Card className="mb-8 shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-xl font-medium mb-4">Logic Map</h2>
          <div className="overflow-x-auto">
            <svg width="980" height="160" className="mx-auto">
              <rect x="10" y="20" width="180" height="60" rx="16" className="fill-white" stroke="#CBD5E1" />
              <text x="100" y="55" textAnchor="middle" className="fill-black">Entrada de Datos</text>
              <rect x="210" y="20" width="180" height="60" rx="16" className="fill-white" stroke="#CBD5E1" />
              <text x="300" y="55" textAnchor="middle" className="fill-black">Base de Datos</text>
              <rect x="410" y="20" width="180" height="60" rx="16" className="fill-white" stroke="#CBD5E1" />
              <text x="500" y="55" textAnchor="middle" className="fill-black">Precios</text>
              <rect x="610" y="20" width="180" height="60" rx="16" className="fill-white" stroke="#CBD5E1" />
              <text x="700" y="55" textAnchor="middle" className="fill-black">Tablas/Factores</text>
              <rect x="810" y="20" width="180" height="60" rx="16" className="fill-white" stroke="#CBD5E1" />
              <text x="900" y="55" textAnchor="middle" className="fill-black">Resultado</text>
              <line x1="190" y1="50" x2="210" y2="50" stroke="#94A3B8" markerEnd="url(#arrow)" />
              <line x1="390" y1="50" x2="410" y2="50" stroke="#94A3B8" markerEnd="url(#arrow)" />
              <line x1="590" y1="50" x2="610" y2="50" stroke="#94A3B8" markerEnd="url(#arrow)" />
              <line x1="790" y1="50" x2="810" y2="50" stroke="#94A3B8" markerEnd="url(#arrow)" />
              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L6,3 z" fill="#94A3B8" />
                </marker>
              </defs>
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* 1) Especificación */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-medium">Especificación del Cable</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label>Metal</Label>
                <Select value={metal} onValueChange={(v)=>setMetal(v as Metal)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cobre">Cobre</SelectItem>
                    <SelectItem value="Aluminio">Aluminio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipología</Label>
                <Select value={tipologia} onValueChange={(v)=>setTipologia(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unipolar">Unipolar</SelectItem>
                    <SelectItem value="tripolar">Tripolar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fases</Label>
                <Select value={String(fases)} onValueChange={(v)=>setFases(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sección (mm²)</Label>
                <Select value={String(seccion)} onValueChange={(v)=>setSeccion(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECCIONES.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tensión</Label>
                <Select value={tension} onValueChange={setTension}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TENSIONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vaina</Label>
                <Select value={sheathKey} onValueChange={setSheathKey}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHEATH_MULTIPLIERS.map(s => <SelectItem key={s.key} value={s.key}>{s.label} (x{s.factor})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pantalla (mm²)</Label>
                <Select value={String(pantallaMM2)} onValueChange={(v)=>setPantallaMM2(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PANTALLA_MM2.map(p => <SelectItem key={p} value={String(p)}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div className="grow">
                  <Label>Armadura</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={armadura} onChange={(e)=>setArmadura(e.target.checked)} />
                    <span className="text-sm text-slate-600">Incluir</span>
                  </div>
                </div>
                <div className="w-28">
                  <Label>kg/m</Label>
                  <Input type="number" step="0.0001" value={kgmArmadura} onChange={e=>setKgmArmadura(parseFloat(e.target.value)||0)} />
                </div>
              </div>
              <div className="col-span-2 md:col-span-3">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={useWBLong} onChange={(e)=>setUseWBLong(e.target.checked)} /> WB Longitudinal</label>
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={useWBRad} onChange={(e)=>setUseWBRad(e.target.checked)} /> WB Radial</label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2) Precios */}
        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-medium">Precios</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Cu (u$s/kg)</Label><Input type="number" step="0.0001" value={pxCu} onChange={e=>setPxCu(parseFloat(e.target.value)||0)} /></div>
              <div><Label>Al (u$s/kg)</Label><Input type="number" step="0.0001" value={pxAl} onChange={e=>setPxAl(parseFloat(e.target.value)||0)} /></div>
              <div><Label>WB Longitudinal (u$s/m)</Label><Input type="number" step="0.0001" value={pxWBLong} onChange={e=>setPxWBLong(parseFloat(e.target.value)||0)} /></div>
              <div><Label>WB Radial (u$s/m)</Label><Input type="number" step="0.0001" value={pxWBRad} onChange={e=>setPxWBRad(parseFloat(e.target.value)||0)} /></div>
              <div><Label>Vaina base (u$s/kg)</Label><Input type="number" step="0.0001" value={pxVainaBase} onChange={e=>setPxVainaBase(parseFloat(e.target.value)||0)} /></div>
              <div><Label>Armadura (u$s/kg)</Label><Input type="number" step="0.0001" value={pxArmaduraKg} onChange={e=>setPxArmaduraKg(parseFloat(e.target.value)||0)} /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3) Overheads y márgenes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-medium">Costos fijos y variables</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Mermas (%)</Label><Input type="number" step="0.1" value={mermasPct} onChange={e=>setMermasPct(parseFloat(e.target.value)||0)} /></div>
              <div><Label>Indirectos (u$s/m)</Label><Input type="number" step="0.0001" value={indirectosUSDm} onChange={e=>setIndirectosUSDm(parseFloat(e.target.value)||0)} /></div>
              <div><Label>Mano de obra (u$s/m)</Label><Input type="number" step="0.0001" value={moUSDm} onChange={e=>setMoUSDm(parseFloat(e.target.value)||0)} /></div>
              <div><Label>Margen (%)</Label><Input type="number" step="0.1" value={margenPct} onChange={e=>setMargenPct(parseFloat(e.target.value)||0)} /></div>
              <div><Label>TC (ARS/USD)</Label><Input type="number" step="0.01" value={tcARS} onChange={e=>setTcARS(parseFloat(e.target.value)||0)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* 4) Extras personalizables */}
        <Card className="shadow-sm lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">Extras / Componentes personalizados</h2>
              <Button variant="outline" onClick={addExtraRow}><Plus className="w-4 h-4 mr-1"/>Agregar</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">Incl.</th>
                    <th className="py-2 pr-2">Componente</th>
                    <th className="py-2 pr-2">Cat.</th>
                    <th className="py-2 pr-2">Tipo</th>
                    <th className="py-2 pr-2">Precio</th>
                    <th className="py-2 pr-2">kg/m</th>
                    <th className="py-2 pr-2">m</th>
                    <th className="py-2 pr-2 text-right">Costo(m)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {extras.map((r) => {
                    const costo = !r.incluye ? 0 : (r.tipoPrecio === "$/kg" ? r.kgPorMetro * r.precio : r.metros * r.precio);
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-2"><input type="checkbox" checked={!!r.incluye} onChange={(e)=>setExtras(prev=>prev.map(x=>x.id===r.id?{...x, incluye:e.target.checked}:x))} /></td>
                        <td className="py-2 pr-2"><Input value={r.nombre} onChange={(e)=>setExtras(prev=>prev.map(x=>x.id===r.id?{...x, nombre:e.target.value}:x))} /></td>
                        <td className="py-2 pr-2">
                          <Select value={r.categoria||"Materia"} onValueChange={(v)=>setExtras(prev=>prev.map(x=>x.id===r.id?{...x, categoria:v as any}:x))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Materia">Materia</SelectItem>
                              <SelectItem value="Proceso">Proceso</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-2">
                          <Select value={r.tipoPrecio} onValueChange={(v)=>setExtras(prev=>prev.map(x=>x.id===r.id?{...x, tipoPrecio:v as any}:x))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="$/kg">$/kg</SelectItem>
                              <SelectItem value="$/m">$/m</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-2 w-28"><Input type="number" step="0.0001" value={r.precio} onChange={(e)=>setExtras(prev=>prev.map(x=>x.id===r.id?{...x, precio:parseFloat(e.target.value)||0}:x))} /></td>
                        <td className="py-2 pr-2 w-24"><Input type="number" step="0.0001" value={r.kgPorMetro} onChange={(e)=>setExtras(prev=>prev.map(x=>x.id===r.id?{...x, kgPorMetro:parseFloat(e.target.value)||0}:x))} /></td>
                        <td className="py-2 pr-2 w-20"><Input type="number" step="0.0001" value={r.metros} onChange={(e)=>setExtras(prev=>prev.map(x=>x.id===r.id?{...x, metros:parseFloat(e.target.value)||0}:x))} /></td>
                        <td className="py-2 pr-2 text-right font-medium">{formatUSD(costo)}</td>
                        <td className="py-2 pr-2 text-right"><Button size="icon" variant="ghost" onClick={()=>removeExtraRow(r.id)}><Trash2 className="w-4 h-4"/></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5) Resumen & export */}
      <Card className="shadow-sm mt-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-slate-500 text-sm">SUBTOTAL Materiales (USD/m)</div>
              <div className="text-2xl font-semibold">{formatUSD(subtotalMaterias)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm">Mermas {mermasPct}% (USD/m)</div>
              <div className="text-2xl font-semibold">{formatUSD(mermasUSDm)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm">SUBTOTAL Procesos (USD/m)</div>
              <div className="text-2xl font-semibold">{formatUSD(subtotalProcesos)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div>
              <div className="text-slate-500 text-sm">Costo de fábrica (USD/m)</div>
              <div className="text-3xl font-semibold">{formatUSD(costoFabrica)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm">Precio lista (USD/m) — Margen {margenPct}%</div>
              <div className="text-3xl font-semibold">{formatUSD(precioListaUSDm)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm">Precio lista (ARS/m) — TC {tcARS}</div>
              <div className="text-3xl font-semibold">{new Intl.NumberFormat().format(Math.round(precioListaARSm))}</div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-slate-600">
              Metal: <b>{metal}</b> · Sección: <b>{seccion} mm²</b> · Fases: <b>{fases}</b> · Tipología: <b>{tipologia}</b><br/>
              Tensión: <b>{tension}</b> · Vaina: <b>{SHEATH_MULTIPLIERS.find(s=>s.key===sheathKey)?.label}</b> · Pantalla: <b>{pantallaMM2} mm²</b> · WB: <b>{useWBLong?"Long":"-"}</b>/<b>{useWBRad?"Rad":"-"}</b>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1"/>Exportar CSV</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6) Dev Tests */}
      <Card className="shadow-sm mt-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <TestTube className="w-4 h-4"/>
            <h2 className="text-lg font-medium">Dev Tests — sanity checks (no cambian tu estado)</h2>
          </div>
          <p className="text-slate-600 text-sm mb-4">Casos autoevaluados con los precios por defecto. Útiles para comparar resultados al modificar precios/factores.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Test A */}
            <div>
              <div className="text-slate-700 text-sm mb-2"><b>A)</b> Cu, 1×95 mm², Unipolar, sin WB ni armadura, vaina RH, pantalla 6 mm²</div>
              {(() => {
                const r = computeCost({
                  metal: "Cobre", fases: 1, tipologia: "unipolar", seccion: 95, tension: "13.2 kV",
                  sheathKey: "RH", pantallaMM2: 6, armadura: false, useWBLong: false, useWBRad: false,
                  pxCu: DEFAULT_PRECIOS.Cobre_kg, pxAl: DEFAULT_PRECIOS.Aluminio_kg, pxWBLong: DEFAULT_PRECIOS.WB_Longitudinal_m,
                  pxWBRad: DEFAULT_PRECIOS.WB_Radial_m, pxVainaBase: DEFAULT_PRECIOS.VainaBase_kg, pxArmaduraKg: 1.9,
                  kgmArmadura: 0.15, mermasPct: 3, indirectosUSDm: 0.12, moUSDm: 0.2, margenPct: 15, tcARS: 1100,
                });
                return (
                  <div className="text-sm">
                    <div>Materiales: <b>{formatUSD(r.subtotalMaterias)}</b> · Mermas: <b>{formatUSD(r.mermasUSDm)}</b></div>
                    <div>Procesos: <b>{formatUSD(r.subtotalProcesos)}</b> · Fábrica: <b>{formatUSD(r.costoFabrica)}</b></div>
                    <div>Lista: <b>{formatUSD(r.precioListaUSDm)}</b> · ARS/m: <b>{new Intl.NumberFormat().format(Math.round(r.precioListaARSm))}</b></div>
                  </div>
                );
              })()}
            </div>

            {/* Test B */}
            <div>
              <div className="text-slate-700 text-sm mb-2"><b>B)</b> Al, 3×150 mm², Tripolar, con WB L+R y armadura, vaina RH+UV, pantalla 10 mm²</div>
              {(() => {
                const r = computeCost({
                  metal: "Aluminio", fases: 3, tipologia: "tripolar", seccion: 150, tension: "13.2 kV",
                  sheathKey: "RH_UV", pantallaMM2: 10, armadura: true, useWBLong: true, useWBRad: true,
                  pxCu: DEFAULT_PRECIOS.Cobre_kg, pxAl: DEFAULT_PRECIOS.Aluminio_kg, pxWBLong: DEFAULT_PRECIOS.WB_Longitudinal_m,
                  pxWBRad: DEFAULT_PRECIOS.WB_Radial_m, pxVainaBase: DEFAULT_PRECIOS.VainaBase_kg, pxArmaduraKg: 1.9,
                  kgmArmadura: 0.15, mermasPct: 3, indirectosUSDm: 0.12, moUSDm: 0.2, margenPct: 15, tcARS: 1100,
                });
                return (
                  <div className="text-sm">
                    <div>Materiales: <b>{formatUSD(r.subtotalMaterias)}</b> · Mermas: <b>{formatUSD(r.mermasUSDm)}</b></div>
                    <div>Procesos: <b>{formatUSD(r.subtotalProcesos)}</b> · Fábrica: <b>{formatUSD(r.costoFabrica)}</b></div>
                    <div>Lista: <b>{formatUSD(r.precioListaUSDm)}</b> · ARS/m: <b>{new Intl.NumberFormat().format(Math.round(r.precioListaARSm))}</b></div>
                  </div>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-10 text-xs text-slate-500 space-y-2">
        <p><b>Fórmula base materiales</b>: Σ ( kg/m · u$s/kg  +  m · u$s/m ).</p>
        <p><b>Costo de fábrica</b>: Materiales + Mermas% + Procesos (MO + Indirectos).</p>
        <p><b>Precio lista</b>: Costo de fábrica × (1 + Margen%). Conversión a ARS con TC.</p>
        <p>Multiplicadores de vaina: RH 1.30, RH+UV 1.49, PVC 1.43. Densidades: Cu 8890 kg/m³, Al 2703 kg/m³.</p>
      </div>
    </div>
  );
}
