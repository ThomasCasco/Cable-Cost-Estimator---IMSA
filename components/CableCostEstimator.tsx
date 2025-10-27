import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Download, Zap, DollarSign, TrendingUp, Package, Settings } from "lucide-react";

/**
 * Cable Cost Estimator — Diseño Moderno con shadcn/ui
 * 
 * VARIABLES DE ENTRADA:
 * - metal: "Cobre" | "Aluminio"
 * - fases: 1 | 3
 * - tipologia: "unipolar" | "tripolar"
 * - seccion: 25-300 mm²
 * - tension: "3.3 kV" | "6.6 kV" | "13.2 kV" | "33 kV"
 * - sheathKey: "RH" | "RH_UV" | "PVC"
 * - pantallaMM2: 0 | 6 | 10 | 16 mm²
 * - armadura: boolean
 * - useWBLong: boolean (Water Blocking Longitudinal)
 * - useWBRad: boolean (Water Blocking Radial)
 * 
 * VARIABLES DE PRECIOS (USD):
 * - pxCu: Precio cobre ($/kg) - Default: 7.21091
 * - pxAl: Precio aluminio ($/kg) - Default: 2.973
 * - pxWBLong: WB Longitudinal ($/m) - Default: 1.16
 * - pxWBRad: WB Radial ($/m) - Default: 2.21
 * - pxVainaBase: Vaina base ($/kg) - Default: 1.38
 * - pxArmaduraKg: Armadura ($/kg) - Default: 1.9
 * 
 * VARIABLES DE COSTOS:
 * - mermasPct: Porcentaje de mermas (%) - Default: 3
 * - indirectosUSDm: Costos indirectos ($/m) - Default: 0.12
 * - moUSDm: Mano de obra ($/m) - Default: 0.20
 * - margenPct: Margen de utilidad (%) - Default: 15
 * - tcARS: Tipo de cambio ARS/USD - Default: 1100
 */

type Metal = "Cobre" | "Aluminio";

type ComponentRow = {
  id: string;
  nombre: string;
  tipoPrecio: "$/kg" | "$/m";
  precio: number;
  kgPorMetro: number;
  metros: number;
  incluye?: boolean;
  categoria?: "Materia" | "Proceso";
};

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const DENSIDAD_KG_M3 = { Cobre: 8890, Aluminio: 2703 } as const;

const DEFAULT_PRECIOS = {
  Cobre_kg: 7.21091,
  Aluminio_kg: 2.973,
  WB_Longitudinal_m: 1.16,
  WB_Radial_m: 2.21,
  VainaBase_kg: 1.38,
};

const SHEATH_MULTIPLIERS = [
  { key: "RH", label: "RH", factor: 1.30 },
  { key: "RH_UV", label: "RH + UV", factor: 1.49 },
  { key: "PVC", label: "PVC Normal", factor: 1.43 },
] as const;

const SECCIONES = [25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
const TENSIONES = ["3.3 kV", "6.6 kV", "13.2 kV", "33 kV"];
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

function round(n: number, d = 6) {
  return Math.round((n + Number.EPSILON) * 10 ** d) / 10 ** d;
}

export default function CableCostEstimator() {
  const [metal, setMetal] = useState<Metal>("Cobre");
  const [fases, setFases] = useState<number>(1);
  const [tipologia, setTipologia] = useState<"unipolar" | "tripolar">("unipolar");
  const [seccion, setSeccion] = useState<number>(95);
  const [tension, setTension] = useState<string>("13.2 kV");
  const [sheathKey, setSheathKey] = useState<string>("RH");
  const [pantallaMM2, setPantallaMM2] = useState<number>(6);
  const [armadura, setArmadura] = useState<boolean>(false);
  const [pxCu, setPxCu] = useState<number>(DEFAULT_PRECIOS.Cobre_kg);
  const [pxAl, setPxAl] = useState<number>(DEFAULT_PRECIOS.Aluminio_kg);
  const [pxWBLong, setPxWBLong] = useState<number>(DEFAULT_PRECIOS.WB_Longitudinal_m);
  const [pxWBRad, setPxWBRad] = useState<number>(DEFAULT_PRECIOS.WB_Radial_m);
  const [pxVainaBase, setPxVainaBase] = useState<number>(DEFAULT_PRECIOS.VainaBase_kg);
  const [mermasPct, setMermasPct] = useState<number>(3);
  const [indirectosUSDm, setIndirectosUSDm] = useState<number>(0.12);
  const [moUSDm, setMoUSDm] = useState<number>(0.20);
  const [margenPct, setMargenPct] = useState<number>(15);
  const [tcARS, setTcARS] = useState<number>(1100);
  const [pxArmaduraKg, setPxArmaduraKg] = useState<number>(1.9);
  const [kgmArmadura, setKgmArmadura] = useState<number>(0.15);
  const [useWBLong, setUseWBLong] = useState<boolean>(false);
  const [useWBRad, setUseWBRad] = useState<boolean>(false);

  const kgmConductor = useMemo(() => kgConductorPorMetro(seccion, metal, fases), [seccion, metal, fases]);
  const kgmPantalla = useMemo(() => kgPantallaPorMetro(pantallaMM2, fases), [pantallaMM2, fases]);
  const kgmVainaBase = 0.12 * FACTOR_TIPOL[tipologia];
  const vainaFactor = SHEATH_MULTIPLIERS.find(s => s.key === sheathKey)?.factor ?? 1;
  const pxVaina = pxVainaBase * vainaFactor;

  const materias: ComponentRow[] = [
    { id: "conductor", nombre: `Conductor ${metal}`, tipoPrecio: "$/kg", precio: metal === "Cobre" ? pxCu : pxAl, kgPorMetro: kgmConductor, metros: 1, incluye: true, categoria: "Materia" },
    { id: "pantalla", nombre: pantallaMM2 ? `Pantalla Cu ${pantallaMM2} mm²` : "Pantalla (N/A)", tipoPrecio: "$/kg", precio: pxCu, kgPorMetro: kgmPantalla, metros: 1, incluye: pantallaMM2 > 0, categoria: "Materia" },
    { id: "vaina", nombre: `Vaina ${SHEATH_MULTIPLIERS.find(s => s.key === sheathKey)?.label}`, tipoPrecio: "$/kg", precio: pxVaina, kgPorMetro: kgmVainaBase, metros: 1, incluye: true, categoria: "Materia" },
    { id: "wbL", nombre: "WB Longitudinal", tipoPrecio: "$/m", precio: pxWBLong, kgPorMetro: 0, metros: 1, incluye: useWBLong, categoria: "Materia" },
    { id: "wbR", nombre: "WB Radial", tipoPrecio: "$/m", precio: pxWBRad, kgPorMetro: 0, metros: 1, incluye: useWBRad, categoria: "Materia" },
    { id: "arm", nombre: "Armadura", tipoPrecio: "$/kg", precio: pxArmaduraKg, kgPorMetro: armadura ? kgmArmadura : 0, metros: 1, incluye: armadura, categoria: "Materia" },
  ];

  const procesos: ComponentRow[] = [
    { id: "mo", nombre: "Mano de Obra", tipoPrecio: "$/m", precio: moUSDm, kgPorMetro: 0, metros: 1, incluye: true, categoria: "Proceso" },
    { id: "ind", nombre: "Indirectos / Energía", tipoPrecio: "$/m", precio: indirectosUSDm, kgPorMetro: 0, metros: 1, incluye: true, categoria: "Proceso" },
  ];

  const [extras, setExtras] = useState<ComponentRow[]>([]);
  function addExtraRow() {
    setExtras(prev => ([...prev, { id: uid(), nombre: "Extra", tipoPrecio: "$/kg", precio: 1, kgPorMetro: 0, metros: 1, incluye: true, categoria: "Materia" }]));
  }
  function removeExtraRow(id: string) {
    setExtras(prev => prev.filter(x => x.id !== id));
  }

  const filas = useMemo(() => ([...materias, ...procesos, ...extras]), [materias, procesos, extras]);
  const subtotalMaterias = useMemo(() =>
    filas.filter(f => f.categoria === "Materia" && f.incluye).reduce((acc, f) => acc + (f.tipoPrecio === "$/kg" ? f.kgPorMetro * f.precio : f.metros * f.precio), 0), [filas]
  );
  const mermasUSDm = useMemo(() => subtotalMaterias * (mermasPct / 100), [subtotalMaterias, mermasPct]);
  const subtotalProcesos = useMemo(() =>
    filas.filter(f => f.categoria === "Proceso" && f.incluye).reduce((acc, f) => acc + (f.tipoPrecio === "$/kg" ? f.kgPorMetro * f.precio : f.metros * f.precio), 0), [filas]
  );
  const costoFabrica = useMemo(() => subtotalMaterias + mermasUSDm + subtotalProcesos, [subtotalMaterias, mermasUSDm, subtotalProcesos]);
  const precioListaUSDm = useMemo(() => costoFabrica * (1 + margenPct / 100), [costoFabrica, margenPct]);
  const precioListaARSm = useMemo(() => precioListaUSDm * tcARS, [precioListaUSDm, tcARS]);

  function exportCSV() {
    const header = ["Categoria", "Componente", "TipoPrecio", "Precio", "kg/m", "m", "Incluye", "Costo(m)"];
    const rows = filas.map(f => {
      const costo = !f.incluye ? 0 : (f.tipoPrecio === "$/kg" ? f.kgPorMetro * f.precio : f.metros * f.precio);
      return [f.categoria, f.nombre, f.tipoPrecio, round(f.precio), round(f.kgPorMetro), round(f.metros), f.incluye ? "SI" : "NO", round(costo)];
    });
    const resumen = [
      ["SUBTOTAL MATERIALES", "", "", round(subtotalMaterias)],
      ["MERMAS %", mermasPct + "%", "", round(mermasUSDm)],
      ["SUBTOTAL PROCESOS", "", "", round(subtotalProcesos)],
      ["COSTO FÁBRICA (USD/m)", "", "", round(costoFabrica)],
      ["MARGEN %", margenPct + "%", "", ""],
      ["PRECIO LISTA (USD/m)", "", "", round(precioListaUSDm)],
      ["TC ARS", "", "", tcARS],
      ["PRECIO LISTA (ARS/m)", "", "", round(precioListaARSm)],
    ];
    const csv = [header, ...rows, [], ...resumen].map(r => (Array.isArray(r) ? r.join(",") : r)).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "estimacion_cable.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Cable Cost Estimator
              </h1>
              <p className="text-muted-foreground mt-1">Sistema de cotización profesional</p>
            </div>
            <Button onClick={exportCSV} size="lg" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4" />
                Materiales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatUSD(subtotalMaterias)}</div>
              <p className="text-xs text-blue-100 mt-1">USD por metro</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Costo Fábrica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatUSD(costoFabrica)}</div>
              <p className="text-xs text-orange-100 mt-1">Incluye mermas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Lista USD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatUSD(precioListaUSDm)}</div>
              <p className="text-xs text-green-100 mt-1">Margen {margenPct}%</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Lista ARS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${new Intl.NumberFormat().format(Math.round(precioListaARSm))}</div>
              <p className="text-xs text-purple-100 mt-1">TC: {tcARS}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Especificación del Cable
            </CardTitle>
            <CardDescription>Configure las características técnicas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Metal Conductor</Label>
                <Select value={metal} onValueChange={(v) => setMetal(v as Metal)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cobre">🟠 Cobre</SelectItem>
                    <SelectItem value="Aluminio">⚪ Aluminio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipología</Label>
                <Select value={tipologia} onValueChange={(v) => setTipologia(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unipolar">Unipolar</SelectItem>
                    <SelectItem value="tripolar">Tripolar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fases</Label>
                <Select value={String(fases)} onValueChange={(v) => setFases(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Fase</SelectItem>
                    <SelectItem value="3">3 Fases</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sección (mm²)</Label>
                <Select value={String(seccion)} onValueChange={(v) => setSeccion(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECCIONES.map(s => <SelectItem key={s} value={String(s)}>{s} mm²</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tensión</Label>
                <Select value={tension} onValueChange={setTension}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TENSIONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vaina</Label>
                <Select value={sheathKey} onValueChange={setSheathKey}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHEATH_MULTIPLIERS.map(s => <SelectItem key={s.key} value={s.key}>{s.label} (×{s.factor})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pantalla (mm²)</Label>
                <Select value={String(pantallaMM2)} onValueChange={(v) => setPantallaMM2(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PANTALLA_MM2.map(p => <SelectItem key={p} value={String(p)}>{p === 0 ? "Sin pantalla" : `${p} mm²`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Armadura</Label>
                <div className="flex items-center space-x-2 h-9">
                  <input type="checkbox" id="armadura" checked={armadura} onChange={(e) => setArmadura(e.target.checked)} className="w-4 h-4 rounded" />
                  <label htmlFor="armadura" className="text-sm font-medium">Incluir</label>
                </div>
              </div>

              {armadura && (
                <div className="space-y-2">
                  <Label>kg/m Armadura</Label>
                  <Input type="number" step="0.0001" value={kgmArmadura} onChange={e => setKgmArmadura(parseFloat(e.target.value) || 0)} />
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label>Water Blocking</Label>
                <div className="flex items-center space-x-4 h-9">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="wbLong" checked={useWBLong} onChange={(e) => setUseWBLong(e.target.checked)} className="w-4 h-4 rounded" />
                    <label htmlFor="wbLong" className="text-sm font-medium">Longitudinal</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="wbRad" checked={useWBRad} onChange={(e) => setUseWBRad(e.target.checked)} className="w-4 h-4 rounded" />
                    <label htmlFor="wbRad" className="text-sm font-medium">Radial</label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>💰 Precios</CardTitle>
              <CardDescription>Precios unitarios en USD</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Cobre ($/kg)</Label><Input type="number" step="0.0001" value={pxCu} onChange={e => setPxCu(parseFloat(e.target.value) || 0)} /></div>
                <div className="space-y-2"><Label>Aluminio ($/kg)</Label><Input type="number" step="0.0001" value={pxAl} onChange={e => setPxAl(parseFloat(e.target.value) || 0)} /></div>
                <div className="space-y-2"><Label>WB Long. ($/m)</Label><Input type="number" step="0.0001" value={pxWBLong} onChange={e => setPxWBLong(parseFloat(e.target.value) || 0)} /></div>
                <div className="space-y-2"><Label>WB Radial ($/m)</Label><Input type="number" step="0.0001" value={pxWBRad} onChange={e => setPxWBRad(parseFloat(e.target.value) || 0)} /></div>
                <div className="space-y-2"><Label>Vaina base ($/kg)</Label><Input type="number" step="0.0001" value={pxVainaBase} onChange={e => setPxVainaBase(parseFloat(e.target.value) || 0)} /></div>
                <div className="space-y-2"><Label>Armadura ($/kg)</Label><Input type="number" step="0.0001" value={pxArmaduraKg} onChange={e => setPxArmaduraKg(parseFloat(e.target.value) || 0)} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📊 Costos y Márgenes</CardTitle>
              <CardDescription>Configuración operativa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Mermas (%)</Label><Input type="number" step="0.1" value={mermasPct} onChange={e => setMermasPct(parseFloat(e.target.value) || 0)} /></div>
                <div className="space-y-2"><Label>Indirectos ($/m)</Label><Input type="number" step="0.0001" value={indirectosUSDm} onChange={e => setIndirectosUSDm(parseFloat(e.target.value) || 0)} /></div>
                <div className="space-y-2"><Label>Mano obra ($/m)</Label><Input type="number" step="0.0001" value={moUSDm} onChange={e => setMoUSDm(parseFloat(e.target.value) || 0)} /></div>
                <div className="space-y-2"><Label>Margen (%)</Label><Input type="number" step="0.1" value={margenPct} onChange={e => setMargenPct(parseFloat(e.target.value) || 0)} /></div>
                <div className="space-y-2 col-span-2"><Label>TC (ARS/USD)</Label><Input type="number" step="0.01" value={tcARS} onChange={e => setTcARS(parseFloat(e.target.value) || 0)} /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>🔧 Componentes Personalizados</CardTitle>
                <CardDescription>Agregue extras según necesidad</CardDescription>
              </div>
              <Button onClick={addExtraRow} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />Agregar
              </Button>
            </div>
          </CardHeader>
          {extras.length > 0 && (
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-sm font-medium">Incl.</th>
                      <th className="text-left py-3 px-2 text-sm font-medium">Componente</th>
                      <th className="text-left py-3 px-2 text-sm font-medium">Cat.</th>
                      <th className="text-left py-3 px-2 text-sm font-medium">Tipo</th>
                      <th className="text-left py-3 px-2 text-sm font-medium">Precio</th>
                      <th className="text-left py-3 px-2 text-sm font-medium">kg/m</th>
                      <th className="text-left py-3 px-2 text-sm font-medium">m</th>
                      <th className="text-right py-3 px-2 text-sm font-medium">Costo</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {extras.map((r) => {
                      const costo = !r.incluye ? 0 : (r.tipoPrecio === "$/kg" ? r.kgPorMetro * r.precio : r.metros * r.precio);
                      return (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-3 px-2">
                            <input type="checkbox" checked={!!r.incluye} onChange={(e) => setExtras(prev => prev.map(x => x.id === r.id ? { ...x, incluye: e.target.checked } : x))} className="w-4 h-4 rounded" />
                          </td>
                          <td className="py-3 px-2"><Input value={r.nombre} onChange={(e) => setExtras(prev => prev.map(x => x.id === r.id ? { ...x, nombre: e.target.value } : x))} className="h-8" /></td>
                          <td className="py-3 px-2 w-32">
                            <Select value={r.categoria || "Materia"} onValueChange={(v) => setExtras(prev => prev.map(x => x.id === r.id ? { ...x, categoria: v as any } : x))}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Materia">Materia</SelectItem>
                                <SelectItem value="Proceso">Proceso</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-2 w-28">
                            <Select value={r.tipoPrecio} onValueChange={(v) => setExtras(prev => prev.map(x => x.id === r.id ? { ...x, tipoPrecio: v as any } : x))}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="$/kg">$/kg</SelectItem>
                                <SelectItem value="$/m">$/m</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-2 w-24"><Input type="number" step="0.0001" value={r.precio} onChange={(e) => setExtras(prev => prev.map(x => x.id === r.id ? { ...x, precio: parseFloat(e.target.value) || 0 } : x))} className="h-8" /></td>
                          <td className="py-3 px-2 w-24"><Input type="number" step="0.0001" value={r.kgPorMetro} onChange={(e) => setExtras(prev => prev.map(x => x.id === r.id ? { ...x, kgPorMetro: parseFloat(e.target.value) || 0 } : x))} className="h-8" /></td>
                          <td className="py-3 px-2 w-20"><Input type="number" step="0.0001" value={r.metros} onChange={(e) => setExtras(prev => prev.map(x => x.id === r.id ? { ...x, metros: parseFloat(e.target.value) || 0 } : x))} className="h-8" /></td>
                          <td className="py-3 px-2 text-right font-medium">{formatUSD(costo)}</td>
                          <td className="py-3 px-2"><Button size="icon" variant="ghost" onClick={() => removeExtraRow(r.id)}><Trash2 className="w-4 h-4" /></Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📈 Desglose Detallado</CardTitle>
            <CardDescription>Análisis completo de costos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Subtotal Materiales</span>
                  <span className="text-lg font-semibold">{formatUSD(subtotalMaterias)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Mermas ({mermasPct}%)</span>
                  <span className="text-lg font-semibold">{formatUSD(mermasUSDm)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Subtotal Procesos</span>
                  <span className="text-lg font-semibold">{formatUSD(subtotalProcesos)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Costo Fábrica</span>
                  <span className="text-2xl font-bold text-orange-600">{formatUSD(costoFabrica)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Margen ({margenPct}%)</span>
                  <span className="text-lg font-semibold">{formatUSD(costoFabrica * (margenPct / 100))}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Lista (USD/m)</span>
                  <span className="text-2xl font-bold text-green-600">{formatUSD(precioListaUSDm)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Lista (ARS/m)</span>
                  <span className="text-2xl font-bold text-purple-600">${new Intl.NumberFormat().format(Math.round(precioListaARSm))}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Configuración:</strong> {metal} • {seccion} mm² • {fases} fase(s) • {tipologia} • {tension} • 
                Vaina {SHEATH_MULTIPLIERS.find(s => s.key === sheathKey)?.label} • Pantalla {pantallaMM2} mm²
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
