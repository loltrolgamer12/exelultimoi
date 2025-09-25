# Sistema HQ-FO-40 V2.0 - Inspecciones Vehiculares con Detección de Fatiga

## 📋 Descripción del Proyecto

Sistema completo de inspecciones vehiculares con detección avanzada de fatiga del conductor. Incluye backend con API REST y frontend React con Material-UI.

## 🏗️ Arquitectura del Sistema

### Backend (Node.js + Express + Prisma)
- **Puerto**: 3001
- **Base de datos**: PostgreSQL con Prisma ORM
- **Características**:
  - API REST completa
  - Procesamiento de archivos Excel
  - Generación de reportes PDF
  - Detección de fatiga del conductor
  - Sistema de alertas en tiempo real
  - Validación de duplicados
  - Rate limiting y seguridad

### Frontend (React + TypeScript + Material-UI)
- **Puerto**: 3000
- **Características**:
  - Dashboard interactivo con widgets en tiempo real
  - Sistema de búsqueda avanzada con filtros
  - Gestión de conductores y vehículos
  - Análisis de fatiga especializado
  - Centro de alertas
  - Generación de reportes PDF
  - Carga de archivos Excel
  - Diseño responsive

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### Backend
```bash
cd backend
npm install
```

#### Variables de Entorno (.env)
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/hq_fo_40"
PORT=3001
NODE_ENV=development
```

#### Configurar Base de Datos
```bash
npx prisma migrate dev
npx prisma generate
```

#### Iniciar Backend
```bash
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## 📊 Funcionalidades Principales

### 1. Dashboard Principal
- **Widgets en tiempo real**: Inspecciones del día, alertas críticas, conductores activos
- **KPIs**: Eficiencia operacional, tasa de alertas, índice de fatiga
- **Gráficos**: Tendencias, problemas comunes, estado del sistema
- **Auto-refresh**: Actualización automática cada 5 minutos

### 2. Sistema de Búsqueda
- **Búsqueda básica**: Por conductor, placa, fecha, contrato, campo
- **Filtros rápidos**: Solo alertas críticas, advertencias, problemas de fatiga
- **Búsqueda avanzada**: Criterios complejos, rangos de puntaje, ordenamiento
- **Exportación**: JSON, CSV, Excel, PDF

### 3. Gestión de Conductores
- **Perfil completo**: Historial, estadísticas, tendencias
- **Análisis de fatiga**: Medicamentos, sueño, síntomas, aptitud
- **Problemas recurrentes**: Identificación de patrones
- **Eficiencia**: Cálculo automático de desempeño

### 4. Gestión de Vehículos
- **Estado operativo**: Operativo, mantenimiento, crítico
- **Historial de inspecciones**: Por vehículo y conductor
- **Problemas mecánicos**: Identificación de fallas recurrentes
- **Conductores asignados**: Relación vehículo-conductor

### 5. Análisis de Fatiga
- **4 Preguntas clave**:
  - ¿Ha consumido medicamentos que afecten su alerta?
  - ¿Ha dormido al menos 7 horas en las últimas 24 horas?
  - ¿Se encuentra libre de síntomas de fatiga?
  - ¿Se siente en condiciones físicas y mentales para conducir?
- **Visualizaciones**: Gráficos de pastel, barras, tendencias temporales
- **Recomendaciones**: Basadas en análisis de datos
- **Reportes PDF**: Análisis detallado con recomendaciones

### 6. Centro de Alertas
- **Tipos**: Críticas (rojas) y Advertencias (amarillas)
- **Estados**: Activa, En revisión, Resuelta
- **Prioridades**: Alta, Media, Baja
- **Auto-refresh**: Actualización cada 30 segundos
- **Filtros**: Por tipo, estado, prioridad

### 7. Sistema de Reportes
- **Reporte Diario**: Inspecciones del día con gráficos
- **Reporte Ejecutivo**: Resumen con comparaciones y proyecciones
- **Análisis de Fatiga**: Reporte especializado en fatiga
- **Reportes Personalizados**: Selección de secciones específicas
- **Formatos**: PDF profesional con gráficos y tablas

### 8. Carga de Archivos
- **Formatos soportados**: .xlsx, .xls
- **Validación automática**: Detección de errores y duplicados
- **Procesamiento en lote**: Archivos de hasta 50MB
- **Historial**: Seguimiento de todos los uploads
- **Reversión**: Posibilidad de revertir procesamientos

## 🔧 API Endpoints

### Dashboard
- `GET /api/dashboard/stats` - Estadísticas principales
- `GET /api/dashboard/widgets` - Datos para widgets
- `GET /api/dashboard/kpis` - Indicadores clave
- `GET /api/dashboard/pdf/daily-report` - Reporte diario PDF
- `GET /api/dashboard/pdf/executive-summary` - Resumen ejecutivo PDF
- `GET /api/dashboard/pdf/fatigue-analysis` - Análisis fatiga PDF

### Búsqueda
- `GET /api/search/inspections` - Búsqueda general
- `POST /api/search/advanced` - Búsqueda avanzada
- `GET /api/search/driver/:id` - Historial conductor
- `GET /api/search/vehicle/:placa` - Historial vehículo
- `GET /api/search/alerts` - Alertas activas
- `GET /api/search/trends` - Análisis de tendencias

### Upload
- `POST /api/upload/validate` - Validar archivo
- `POST /api/upload/excel` - Procesar archivo Excel
- `GET /api/upload/history` - Historial de uploads
- `DELETE /api/upload/revert/:id` - Revertir procesamiento

## 🗄️ Modelo de Datos

### Inspección
```sql
- id: String (CUID)
- fecha: DateTime
- conductor_nombre: String
- conductor_cedula: String
- placa_vehiculo: String
- contrato: String
- campo: String
- turno: String
- puntaje_total: Float
- tiene_alerta_roja: Boolean
- tiene_advertencias: Boolean
- consumo_medicamentos: Boolean
- horas_sueno_suficientes: Boolean
- libre_sintomas_fatiga: Boolean
- condiciones_aptas: Boolean
- observaciones: String?
```

### Historial Conductor
```sql
- id: String
- conductor_nombre: String
- total_inspecciones: Int
- alertas_rojas_total: Int
- advertencias_total: Int
- promedio_riesgo: Float
- ultima_inspeccion: DateTime?
```

### Archivos Procesados
```sql
- id: String
- nombre_archivo: String
- hash_archivo: String (SHA-256)
- ano_detectado: Int
- total_registros: Int
- registros_nuevos: Int
- registros_duplicados: Int
- estado_procesamiento: String
```

## 🎨 Tecnologías Utilizadas

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **Prisma** - ORM para base de datos
- **PostgreSQL** - Base de datos
- **Multer** - Manejo de archivos
- **ExcelJS** - Procesamiento de Excel
- **PDFKit** - Generación de PDFs
- **Helmet** - Seguridad
- **Rate Limiting** - Control de tráfico

### Frontend
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Material-UI v5** - Componentes de UI
- **React Router** - Navegación
- **Axios** - Cliente HTTP
- **Recharts** - Gráficos y visualizaciones
- **Date-fns** - Manejo de fechas

## 🔒 Características de Seguridad

- **Rate Limiting**: Límites por endpoint
- **Helmet**: Headers de seguridad
- **CORS**: Configuración de orígenes
- **Validación**: Entrada de datos
- **Sanitización**: Prevención de inyecciones
- **Error Handling**: Manejo seguro de errores

## 📈 Métricas y KPIs

### Operacionales
- Total de inspecciones
- Inspecciones diarias promedio
- Eficiencia operacional
- Puntaje promedio

### Seguridad
- Alertas rojas
- Advertencias
- Tasa de alertas críticas
- Tasa de advertencias

### Fatiga
- Conductores con medicamentos
- Conductores con sueño insuficiente
- Conductores con síntomas
- Conductores no aptos
- Índice general de fatiga

## 🚦 Estados del Sistema

### Inspecciones
- **Sin problemas**: Verde ✅
- **Advertencias**: Amarillo ⚠️
- **Alertas críticas**: Rojo 🚨

### Vehículos
- **Operativo**: Funcionando correctamente
- **Mantenimiento**: Requiere atención
- **Crítico**: Fuera de servicio

### Conductores
- **Excelente**: Eficiencia ≥ 90%
- **Bueno**: Eficiencia ≥ 75%
- **Requiere atención**: Eficiencia < 75%

## 📱 Responsive Design

El frontend está optimizado para:
- **Desktop**: Experiencia completa
- **Tablet**: Navegación adaptada
- **Mobile**: Funcionalidades esenciales

## 🔄 Actualizaciones en Tiempo Real

- **Dashboard**: Auto-refresh cada 5 minutos
- **Alertas**: Auto-refresh cada 30 segundos
- **Widgets**: Datos en tiempo real
- **Notificaciones**: Sistema de badges

## 📋 Próximas Funcionalidades

- [ ] Notificaciones push
- [ ] Integración con WhatsApp
- [ ] Dashboard móvil nativo
- [ ] Análisis predictivo con IA
- [ ] Integración con GPS
- [ ] Sistema de roles y permisos
- [ ] API GraphQL
- [ ] Microservicios

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- Email: soporte@hq-fo-40.com
- Documentación: [docs.hq-fo-40.com](https://docs.hq-fo-40.com)
- Issues: [GitHub Issues](https://github.com/tu-usuario/hq-fo-40/issues)

---

**Sistema HQ-FO-40 V2.0** - Desarrollado con ❤️ para la seguridad vial y la detección de fatiga del conductor.
