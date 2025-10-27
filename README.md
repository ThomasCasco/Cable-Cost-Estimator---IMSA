# Cable Cost Estimator — Next.js

Aplicación web para calcular el costo de fabricación de cables eléctricos, con desglose detallado de materiales, procesos, mermas y márgenes.

## 🚀 Características

- **Cálculo completo de costos**: Materiales, mermas, procesos (MO + indirectos) y margen de utilidad
- **Configuración flexible**: Metal (Cu/Al), secciones, tensiones, vainas, pantallas, armadura y WB
- **Componentes personalizables**: Agrega extras con precios en $/kg o $/m
- **Exportación CSV**: Descarga el desglose completo de costos
- **Dev Tests integrados**: Casos de prueba automáticos para validar cálculos
- **UI moderna y responsive**: Funciona en desktop y móviles
- **TypeScript**: Código con tipos para mayor seguridad

## 📋 Requisitos

- **Node.js** v18+ recomendado
- **npm** o **yarn**

## 🛠️ Instalación y desarrollo local

```powershell
# 1. Instalar dependencias
npm install

# 2. Ejecutar en modo desarrollo (hot reload)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📦 Build de producción

```powershell
# Crear build optimizado
npm run build

# Ejecutar servidor de producción
npm run start
```

## 🌐 Despliegue en Vercel (recomendado)

### Opción A: Desde repositorio Git

1. Sube este proyecto a GitHub/GitLab/Bitbucket
2. Ve a [vercel.com](https://vercel.com) y crea una cuenta (gratis)
3. Haz clic en "New Project" → "Import Git Repository"
4. Selecciona tu repositorio
5. Vercel detectará automáticamente Next.js y configurará todo
6. Haz clic en "Deploy" → ¡Listo! 🎉

### Opción B: Desde la CLI de Vercel

```powershell
# Instalar Vercel CLI
npm i -g vercel

# Desplegar (sigue las instrucciones interactivas)
vercel
```

### Opción C: Arrastrar y soltar

1. Ejecuta `npm run build` localmente
2. Ve a [vercel.com](https://vercel.com/new)
3. Arrastra la carpeta del proyecto
4. Vercel desplegará automáticamente

## 📁 Estructura del proyecto

```
c:\PEE\
├── components/
│   └── CableCostEstimator.tsx    # Componente principal con lógica de cálculo
├── pages/
│   ├── _app.jsx                  # Configuración de Next.js
│   └── index.jsx                 # Página principal
├── styles/
│   └── globals.css               # Estilos globales (utility-first)
├── jsconfig.json                 # Configuración de alias e imports
├── package.json                  # Dependencias y scripts
└── README.md                     # Este archivo
```

## 🧮 Lógica de cálculo

La aplicación sigue el flujo:

**Entrada de Datos** → **Base de Datos** → **Precios** → **Tablas/Factores** → **Resultado**

### Fórmulas principales

1. **kg/m conductor** = sección(mm²) × 1e-6 × densidad(metal) × fases
2. **kg/m pantalla** = pantalla(mm²) × 1e-6 × densidad(Cu) × fases
3. **Precio vaina** = precio_base_vaina × multiplicador(RH/RH+UV/PVC)
4. **Materiales USD/m** = Σ(kg/m × $/kg) + Σ(m × $/m)
5. **Costo fábrica** = Materiales + Mermas% + Procesos (MO + Indirectos)
6. **Precio lista** = Costo fábrica × (1 + Margen%)

### Constantes predefinidas

- **Densidades**: Cu 8890 kg/m³, Al 2703 kg/m³
- **Multiplicadores de vaina**: RH 1.30, RH+UV 1.49, PVC 1.43
- **Factor tipología**: Unipolar 1.0, Tripolar 1.05

## 🎨 Tecnologías utilizadas

- **Next.js 13** - Framework React con SSR y optimización automática
- **TypeScript** - Tipado estático para mayor robustez
- **React Hooks** - useState, useMemo para gestión de estado
- **Lucide React** - Iconos modernos y optimizados
- **CSS Modules** - Estilos con utility classes (estilo Tailwind)

## 🔧 Personalización

### Modificar precios por defecto

Edita las constantes en `components/CableCostEstimator.tsx`:

```typescript
const DEFAULT_PRECIOS = {
  Cobre_kg: 7.21091,
  Aluminio_kg: 2.973,
  WB_Longitudinal_m: 1.16,
  WB_Radial_m: 2.21,
  VainaBase_kg: 1.38,
};
```

### Agregar nuevas secciones o tensiones

```typescript
const SECCIONES = [25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400]; // Agrega 400
const TENSIONES = ["3.3 kV", "6.6 kV", "13.2 kV", "33 kV", "66 kV"]; // Agrega 66 kV
```

### Cambiar estilos

Edita `styles/globals.css` para modificar colores, espaciados y tipografías.

## 📝 Notas técnicas

- Los componentes UI (Button, Input, Select, Card) están implementados directamente en el archivo para evitar dependencias externas
- El archivo original `.jsx` con tipos TypeScript ha sido convertido a `.tsx` para compatibilidad con Next.js
- El proyecto **no requiere Tailwind CSS** - los estilos están en CSS puro con clases utility
- Compatible con React 18+ y Next.js 13+

## 🐛 Troubleshooting

### Error: "Cannot find module 'lucide-react'"
```powershell
npm install lucide-react
```

### Build falla con errores de TypeScript
Verifica que `jsconfig.json` esté correctamente configurado con:
```json
{
  "compilerOptions": {
    "jsx": "preserve"
  }
}
```

### Estilos no se aplican correctamente
Asegúrate de que `pages/_app.jsx` importe `styles/globals.css`:
```jsx
import '../styles/globals.css'
```

## 📄 Licencia

Proyecto de uso libre. Modifica y adapta según tus necesidades.

## 🤝 Contribuciones

¡Las mejoras son bienvenidas! Abre un issue o pull request si encuentras bugs o tienes sugerencias.

---

**Desarrollado con ❤️ usando Next.js y TypeScript**
