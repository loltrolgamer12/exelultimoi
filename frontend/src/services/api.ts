import axios from 'axios';

// 🌐 Configuración base de la API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// 📡 Instancia de Axios configurada
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos para archivos grandes
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔧 Interceptores para manejo de errores y logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] 📤 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] ❌ Error en request:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] ✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[API] ❌ Error en response:', error.response?.data || error.message);
    
    // Manejo específico de errores
    if (error.response?.status === 429) {
      console.warn('[API] ⚠️ Rate limit excedido');
    } else if (error.response?.status >= 500) {
      console.error('[API] 🔥 Error del servidor');
    }
    
    return Promise.reject(error);
  }
);

// 🏥 Tipos de datos para TypeScript
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface InspeccionData {
  id: string;
  fecha: string;
  conductor_nombre: string;
  conductor_cedula: string;
  placa_vehiculo: string;
  contrato: string;
  campo: string;
  turno: string;
  puntaje_total: number;
  tiene_alerta_roja: boolean;
  tiene_advertencias: boolean;
  // Fatiga
  consumo_medicamentos: boolean;
  horas_sueno_suficientes: boolean;
  libre_sintomas_fatiga: boolean;
  condiciones_aptas: boolean;
  observaciones?: string;
}

export interface DashboardStats {
  totalInspecciones: number;
  alertasRojas: number;
  advertencias: number;
  conductoresActivos: number;
  vehiculosInspeccionados: number;
  eficienciaPromedio: number;
  indiceFatiga: number;
}

export interface SearchFilters {
  fechaInicio?: string;
  fechaFin?: string;
  contrato?: string;
  campo?: string;
  conductor?: string;
  placa?: string;
  tieneAlertas?: boolean;
  tieneAdvertencias?: boolean;
  soloFatiga?: boolean;
  page?: number;
  limit?: number;
}

export interface TrendData {
  fecha: string;
  totalInspecciones: number;
  alertasRojas: number;
  advertencias: number;
  medicamentos: number;
  suenoInsuficiente: number;
  sintomasFatiga: number;
  noAptos: number;
  puntajePromedio: number;
}

// 🔄 Funciones de utilidad para manejo de errores
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'Error desconocido en la API';
};

export const isApiError = (error: any): boolean => {
  return error.response && error.response.status >= 400;
};

// 📊 Función para formatear números
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('es-CO').format(num);
};

// 📅 Función para formatear fechas
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 🎨 Función para obtener color según el estado
export const getStatusColor = (hasAlerts: boolean, hasWarnings: boolean): string => {
  if (hasAlerts) return '#d32f2f'; // Rojo
  if (hasWarnings) return '#ed6c02'; // Naranja
  return '#2e7d32'; // Verde
};

// 📈 Función para calcular porcentajes
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100;
};

export default apiClient;
