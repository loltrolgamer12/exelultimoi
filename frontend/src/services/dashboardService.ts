import { apiClient, ApiResponse, DashboardStats, handleApiError } from './api';

export interface WidgetData {
  resumenHoy: {
    inspecciones: number;
    alertasRojas: number;
    advertencias: number;
    conductores: number;
    vehiculos: number;
    eficiencia: number;
  };
  ultimasAlertas: Array<{
    id: string;
    fecha: string;
    conductor_nombre: string;
    placa_vehiculo: string;
    observaciones: string;
    timeAgo: string;
  }>;
  problemasComunes: Array<{
    problema: string;
    count: number;
    percentage: number;
  }>;
  indicadores: {
    tendenciaInspecciones: string;
    alertasCriticas: number;
    statusGeneral: 'green' | 'yellow' | 'red';
  };
}

export interface KPIData {
  operacionales: {
    totalInspecciones: number;
    inspeccionesDiarias: number;
    eficiencia: number;
    puntajePromedio: number;
  };
  seguridad: {
    alertasRojas: number;
    advertencias: number;
    tasaAlertasRojas: number;
    tasaAdvertencias: number;
  };
  fatiga: {
    conductoresMedicamentos: number;
    conductoresSuenoInsuficiente: number;
    conductoresConSintomas: number;
    conductoresNoAptos: number;
    indiceFatiga: number;
  };
  metas: {
    eficienciaObjetivo: number;
    tasaAlertasMaxima: number;
    puntajeMinimoObjetivo: number;
    indiceFatigaMaximo: number;
  };
  cumplimiento: {
    eficiencia: boolean;
    alertas: boolean;
    puntaje: boolean;
    fatiga: boolean;
    general: boolean;
  };
}

export interface PerformanceMetrics {
  rendimientoPorContrato: Array<{
    contrato: string;
    totalInspecciones: number;
    alertasRojas: number;
    eficiencia: number;
  }>;
  rendimientoPorCampo: Array<{
    campo: string;
    totalInspecciones: number;
    alertasRojas: number;
    eficiencia: number;
  }>;
  tendenciaMensual: Array<{
    mes: string;
    inspecciones: number;
    alertas: number;
    eficiencia: number;
  }>;
}

class DashboardService {
  // 📊 Obtener estadísticas principales del dashboard
  async getMainStats(filters?: {
    periodo?: string;
    contrato?: string;
    campo?: string;
  }): Promise<DashboardStats> {
    try {
      const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats', {
        params: filters
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo estadísticas');
    } catch (error) {
      console.error('[DashboardService] Error en getMainStats:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📈 Obtener métricas de rendimiento
  async getPerformanceMetrics(periodo: string = '30days'): Promise<PerformanceMetrics> {
    try {
      const response = await apiClient.get<ApiResponse<PerformanceMetrics>>('/dashboard/performance', {
        params: { periodo }
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo métricas de rendimiento');
    } catch (error) {
      console.error('[DashboardService] Error en getPerformanceMetrics:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 🎯 Obtener KPIs (Indicadores Clave de Rendimiento)
  async getKPIs(filters?: {
    periodo?: string;
    contrato?: string;
    campo?: string;
  }): Promise<KPIData> {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/dashboard/kpis', {
        params: filters
      });
      // Ajuste: tomar los KPIs desde data.kpis
      if (response.data.success && response.data.data && response.data.data.kpis) {
        return response.data.data.kpis;
      }
      throw new Error(response.data.message || 'Error obteniendo KPIs');
    } catch (error) {
      console.error('[DashboardService] Error en getKPIs:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📊 Obtener datos para widgets del dashboard
  async getWidgets(): Promise<WidgetData> {
    try {
      const response = await apiClient.get<ApiResponse<WidgetData>>('/dashboard/widgets');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo datos de widgets');
    } catch (error) {
      console.error('[DashboardService] Error en getWidgets:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 🚨 Obtener panel de alertas
  async getAlertsPanel(filters?: {
    tipo?: 'todas' | 'criticas' | 'advertencias';
    limite?: number;
  }): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse>('/dashboard/alerts', {
        params: filters
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo panel de alertas');
    } catch (error) {
      console.error('[DashboardService] Error en getAlertsPanel:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📋 Obtener reporte ejecutivo
  async getExecutiveReport(periodo: string = '30days'): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse>('/dashboard/executive-report', {
        params: { periodo }
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo reporte ejecutivo');
    } catch (error) {
      console.error('[DashboardService] Error en getExecutiveReport:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📄 Descargar reporte diario en PDF
  async downloadDailyReport(options: {
    fecha?: string;
    includeCharts?: boolean;
    template?: string;
    contrato?: string;
    campo?: string;
  } = {}): Promise<Blob> {
    try {
      const response = await apiClient.get('/dashboard/pdf/daily-report', {
        params: options,
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      console.error('[DashboardService] Error en downloadDailyReport:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📊 Descargar resumen ejecutivo en PDF
  async downloadExecutiveSummary(options: {
    periodo?: string;
    includeComparisons?: boolean;
    includeProjections?: boolean;
    template?: string;
    logo?: boolean;
  } = {}): Promise<Blob> {
    try {
      const response = await apiClient.get('/dashboard/pdf/executive-summary', {
        params: options,
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      console.error('[DashboardService] Error en downloadExecutiveSummary:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 🚨 Descargar análisis de fatiga en PDF
  async downloadFatigueAnalysis(options: {
    periodo?: string;
    includeDriverDetails?: boolean;
    includeRecommendations?: boolean;
    template?: string;
  } = {}): Promise<Blob> {
    try {
      const response = await apiClient.get('/dashboard/pdf/fatigue-analysis', {
        params: options,
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      console.error('[DashboardService] Error en downloadFatigueAnalysis:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📋 Generar reporte personalizado en PDF
  async generateCustomReport(options: {
    titulo?: string;
    filtros?: any;
    secciones?: string[];
    formato?: string;
    includeCharts?: boolean;
    includeData?: boolean;
    logo?: boolean;
  }): Promise<Blob> {
    try {
      const response = await apiClient.post('/dashboard/pdf/custom-report', options, {
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      console.error('[DashboardService] Error en generateCustomReport:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 🔄 Refrescar datos del dashboard
  async refreshDashboard(): Promise<boolean> {
    try {
      // Implementar lógica de refresh si es necesario
      console.log('[DashboardService] Refrescando datos del dashboard...');
      return true;
    } catch (error) {
      console.error('[DashboardService] Error en refreshDashboard:', error);
      return false;
    }
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
