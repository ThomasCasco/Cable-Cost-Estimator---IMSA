# 📋 VARIABLES DEL CABLE COST ESTIMATOR

## 🔧 VARIABLES DE CONFIGURACIÓN DEL CABLE

### Metal Conductor
- **Variable**: `metal`
- **Tipo**: "Cobre" | "Aluminio"
- **Default**: "Cobre"
- **Descripción**: Material del conductor principal

### Tipología
- **Variable**: `tipologia`
- **Tipo**: "unipolar" | "tripolar"
- **Default**: "unipolar"
- **Descripción**: Configuración del cable (factor de cálculo 1.0 o 1.05)

### Número de Fases
- **Variable**: `fases`
- **Tipo**: number (1 | 3)
- **Default**: 1
- **Descripción**: Cantidad de fases del cable

### Sección del Conductor
- **Variable**: `seccion`
- **Tipo**: number
- **Opciones**: 25, 35, 50, 70, 95, 120, 150, 185, 240, 300 (mm²)
- **Default**: 95
- **Descripción**: Área de la sección transversal del conductor

### Tensión
- **Variable**: `tension`
- **Tipo**: string
- **Opciones**: "3.3 kV", "6.6 kV", "13.2 kV", "33 kV"
- **Default**: "13.2 kV"
- **Descripción**: Tensión nominal del cable

### Tipo de Vaina
- **Variable**: `sheathKey`
- **Tipo**: string
- **Opciones**: 
  - "RH" (factor 1.30)
  - "RH_UV" (factor 1.49)
  - "PVC" (factor 1.43)
- **Default**: "RH"
- **Descripción**: Material de la vaina exterior

### Pantalla
- **Variable**: `pantallaMM2`
- **Tipo**: number
- **Opciones**: 0, 6, 10, 16 (mm²)
- **Default**: 6
- **Descripción**: Sección de la pantalla de cobre

### Armadura
- **Variable**: `armadura`
- **Tipo**: boolean
- **Default**: false
- **Descripción**: Incluir o no armadura metálica

### kg/m de Armadura
- **Variable**: `kgmArmadura`
- **Tipo**: number
- **Default**: 0.15
- **Descripción**: Peso de la armadura por metro (solo si armadura = true)

### Water Blocking Longitudinal
- **Variable**: `useWBLong`
- **Tipo**: boolean
- **Default**: false
- **Descripción**: Incluir barrera de agua longitudinal

### Water Blocking Radial
- **Variable**: `useWBRad`
- **Tipo**: boolean
- **Default**: false
- **Descripción**: Incluir barrera de agua radial

---

## 💰 VARIABLES DE PRECIOS (USD)

### Precio del Cobre
- **Variable**: `pxCu`
- **Tipo**: number
- **Unidad**: USD/kg
- **Default**: 7.21091
- **Descripción**: Precio del cobre por kilogramo

### Precio del Aluminio
- **Variable**: `pxAl`
- **Tipo**: number
- **Unidad**: USD/kg
- **Default**: 2.973
- **Descripción**: Precio del aluminio por kilogramo

### Precio WB Longitudinal
- **Variable**: `pxWBLong`
- **Tipo**: number
- **Unidad**: USD/m
- **Default**: 1.16
- **Descripción**: Precio del Water Blocking longitudinal por metro

### Precio WB Radial
- **Variable**: `pxWBRad`
- **Tipo**: number
- **Unidad**: USD/m
- **Default**: 2.21
- **Descripción**: Precio del Water Blocking radial por metro

### Precio Vaina Base
- **Variable**: `pxVainaBase`
- **Tipo**: number
- **Unidad**: USD/kg
- **Default**: 1.38
- **Descripción**: Precio base de la vaina (se multiplica por factor según tipo)

### Precio Armadura
- **Variable**: `pxArmaduraKg`
- **Tipo**: number
- **Unidad**: USD/kg
- **Default**: 1.9
- **Descripción**: Precio de la armadura por kilogramo

---

## 📊 VARIABLES DE COSTOS Y MÁRGENES

### Porcentaje de Mermas
- **Variable**: `mermasPct`
- **Tipo**: number
- **Unidad**: %
- **Default**: 3
- **Descripción**: Porcentaje de desperdicio de materiales

### Costos Indirectos
- **Variable**: `indirectosUSDm`
- **Tipo**: number
- **Unidad**: USD/m
- **Default**: 0.12
- **Descripción**: Costos indirectos (energía, overhead) por metro

### Mano de Obra
- **Variable**: `moUSDm`
- **Tipo**: number
- **Unidad**: USD/m
- **Default**: 0.20
- **Descripción**: Costo de mano de obra por metro

### Margen de Utilidad
- **Variable**: `margenPct`
- **Tipo**: number
- **Unidad**: %
- **Default**: 15
- **Descripción**: Margen de ganancia sobre el costo de fábrica

### Tipo de Cambio
- **Variable**: `tcARS`
- **Tipo**: number
- **Unidad**: ARS/USD
- **Default**: 1100
- **Descripción**: Tipo de cambio pesos argentinos por dólar

---

## 🧮 VARIABLES CALCULADAS (Read-Only)

### Peso del Conductor por Metro
- **Variable**: `kgmConductor`
- **Fórmula**: `seccion × 10⁻⁶ × densidad(metal) × fases`
- **Densidades**:
  - Cobre: 8890 kg/m³
  - Aluminio: 2703 kg/m³

### Peso de Pantalla por Metro
- **Variable**: `kgmPantalla`
- **Fórmula**: `pantallaMM2 × 10⁻⁶ × 8890 × fases`

### Subtotal de Materiales
- **Variable**: `subtotalMaterias`
- **Unidad**: USD/m
- **Descripción**: Suma de todos los costos de materiales incluidos

### Mermas en USD/m
- **Variable**: `mermasUSDm`
- **Fórmula**: `subtotalMaterias × (mermasPct / 100)`

### Subtotal de Procesos
- **Variable**: `subtotalProcesos`
- **Unidad**: USD/m
- **Descripción**: Suma de mano de obra e indirectos

### Costo de Fábrica
- **Variable**: `costoFabrica`
- **Fórmula**: `subtotalMaterias + mermasUSDm + subtotalProcesos`
- **Unidad**: USD/m

### Precio Lista en USD
- **Variable**: `precioListaUSDm`
- **Fórmula**: `costoFabrica × (1 + margenPct / 100)`
- **Unidad**: USD/m

### Precio Lista en ARS
- **Variable**: `precioListaARSm`
- **Fórmula**: `precioListaUSDm × tcARS`
- **Unidad**: ARS/m

---

## 🎨 CONSTANTES DEL SISTEMA

### Multiplicadores de Vaina
```typescript
const SHEATH_MULTIPLIERS = [
  { key: "RH", label: "RH", factor: 1.30 },
  { key: "RH_UV", label: "RH + UV", factor: 1.49 },
  { key: "PVC", label: "PVC Normal", factor: 1.43 },
]
```

### Factor de Tipología
```typescript
const FACTOR_TIPOL = { 
  unipolar: 1.0, 
  tripolar: 1.05 
}
```

### Densidades de Metales
```typescript
const DENSIDAD_KG_M3 = { 
  Cobre: 8890, 
  Aluminio: 2703 
}
```

### Secciones Disponibles (mm²)
```typescript
const SECCIONES = [25, 35, 50, 70, 95, 120, 150, 185, 240, 300]
```

### Tensiones Disponibles
```typescript
const TENSIONES = ["3.3 kV", "6.6 kV", "13.2 kV", "33 kV"]
```

### Pantallas Disponibles (mm²)
```typescript
const PANTALLA_MM2 = [0, 6, 10, 16]
```

---

## 📝 COMPONENTES PERSONALIZADOS

Los usuarios pueden agregar componentes extras con:

- **nombre**: string (nombre del componente)
- **tipoPrecio**: "$/kg" | "$/m"
- **precio**: number (precio unitario)
- **kgPorMetro**: number (peso por metro, si aplica)
- **metros**: number (cantidad de metros, si aplica)
- **incluye**: boolean (activar/desactivar en el cálculo)
- **categoria**: "Materia" | "Proceso"

---

## 🎯 EJEMPLO DE USO

```typescript
// Configuración de ejemplo
const config = {
  // Cable
  metal: "Cobre",
  fases: 3,
  tipologia: "tripolar",
  seccion: 150,
  tension: "13.2 kV",
  sheathKey: "RH_UV",
  pantallaMM2: 10,
  armadura: true,
  kgmArmadura: 0.15,
  useWBLong: true,
  useWBRad: true,
  
  // Precios
  pxCu: 7.21091,
  pxAl: 2.973,
  pxWBLong: 1.16,
  pxWBRad: 2.21,
  pxVainaBase: 1.38,
  pxArmaduraKg: 1.9,
  
  // Costos
  mermasPct: 3,
  indirectosUSDm: 0.12,
  moUSDm: 0.20,
  margenPct: 15,
  tcARS: 1100
}

// Resultado esperado:
// Materiales: ~$6.82 USD/m
// Costo Fábrica: ~$7.35 USD/m
// Precio Lista: ~$8.45 USD/m
// Precio Lista ARS: ~$9,295 ARS/m
```

---

## 🔄 FLUJO DE CÁLCULO

```
1. Entrada de Datos (especificación del cable)
   ↓
2. Base de Datos (constantes y factores)
   ↓
3. Precios (valores unitarios)
   ↓
4. Tablas/Factores (multiplicadores)
   ↓
5. Cálculo de Materiales
   ↓
6. Aplicación de Mermas
   ↓
7. Suma de Procesos
   ↓
8. Costo de Fábrica
   ↓
9. Aplicación de Margen
   ↓
10. Resultado Final (USD y ARS)
```

---

**Versión del documento**: 1.0  
**Fecha**: Octubre 2025  
**Framework**: Next.js 13 + shadcn/ui + Tailwind CSS v3
