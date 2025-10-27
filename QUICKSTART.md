# Cable Cost Estimator - Guía de Inicio Rápido

## ✅ Verificación de instalación

Ejecuta estos comandos para verificar que todo está correcto:

```powershell
# 1. Verifica la versión de Node.js (debe ser v18+)
node --version

# 2. Instala las dependencias
npm install

# 3. Ejecuta el build
npm run build

# 4. Inicia el servidor de desarrollo
npm run dev
```

Si todos los comandos funcionan sin errores, ¡estás listo! 🎉

## 🚀 Despliegue en Vercel (3 pasos)

### Método 1: GitHub + Vercel (Recomendado)

```powershell
# 1. Inicializa Git
git init
git add .
git commit -m "Initial commit"

# 2. Crea un repositorio en GitHub y súbelo
git remote add origin https://github.com/tu-usuario/tu-repo.git
git branch -M main
git push -u origin main

# 3. Ve a vercel.com
# - Crea cuenta (gratis)
# - "New Project" → Importa tu repositorio
# - Click "Deploy" ✅
```

### Método 2: Vercel CLI (Rápido)

```powershell
# 1. Instala Vercel CLI
npm i -g vercel

# 2. Despliega (sigue las instrucciones)
vercel

# 3. Para despliegue a producción
vercel --prod
```

## 🎯 URLs después del despliegue

Vercel te dará:
- **Preview URL**: `https://tu-proyecto-abc123.vercel.app` (para cada commit)
- **Production URL**: `https://tu-proyecto.vercel.app` (dominio principal)

## 📊 Qué esperar

- Build time: ~30-60 segundos
- Tamaño del bundle: ~85 KB (optimizado)
- Performance: ⚡ Excelente (Next.js optimizado)

## 🔧 Personalización post-deploy

Después de desplegar, puedes:
- Configurar variables de entorno en Vercel Dashboard
- Agregar dominio personalizado (gratis en Vercel)
- Configurar analytics y monitoring

## 📱 Prueba tu aplicación

Una vez desplegado, prueba:
1. Cambiar metal de Cobre a Aluminio
2. Modificar la sección (ej: 95 → 150 mm²)
3. Agregar componentes extras
4. Exportar CSV con el botón "Exportar CSV"

## 🐛 Solución de problemas comunes

### Error: "Port 3000 in use"
✅ Normal - Next.js usará puerto 3001 automáticamente

### Error al hacer build
```powershell
# Limpia cache y reinstala
rm -rf node_modules .next
npm install
npm run build
```

### Error en Vercel
- Verifica que `package.json` tenga los scripts correctos
- Revisa los logs en Vercel Dashboard → "Deployments" → Click en tu deploy

## 📚 Recursos útiles

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Vercel](https://vercel.com/docs)
- [Guía de despliegue](https://nextjs.org/docs/deployment)

---

¿Problemas? Abre un issue o revisa los logs en la consola.
