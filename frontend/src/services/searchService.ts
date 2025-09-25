import { apiClient, ApiResponse, InspeccionData, SearchFilters, TrendData, handleApiError } from './api';

export interface SearchResult {
  inspecciones: InspeccionData[];
  totalFound: number;
  totalPages: number;
  currentPage: number;
  filters: SearchFilters;
}

export interface AdvancedSearchFilters extends SearchFilters {
  puntajeMinimo?: number;
  puntajeMaximo?: number;
  tipoProblema?: 'medicamentos' | 'sueno' | 'fatiga' | 'aptitud';
  severidad?: 'baja' | 'media' | 'alta' | 'critica';
  ordenarPor?: 'fecha' | 'puntaje' | 'conductor' | 'vehiculo';
  orden?: 'asc' | 'desc';
}

export interface DriverHistory {
  conductor: {
    nombre: string;
    cedula: string;
    totalInspecciones: number;
    alertasRojas: number;
    advertencias: number;
    promedioRiesgo: number;
    ultimaInspeccion: string;
  };
  historial: InspeccionData[];
  estadisticas: {
    eficiencia: number;
    problemasRecurrentes: string[];
    tendencia: 'mejorando' | 'estable' | 'empeorando';
  };
  alertasFatiga: {
    medicamentos: number;
    suenoInsuficiente: number;
    sintomasFatiga: number;
    noApto: number;
  };
}

export interface VehicleHistory {
  vehiculo: {
    placa: string;
    totalInspecciones: number;
    alertasRojas: number;
    advertencias: number;
    ultimaInspeccion: string;
  };
  historial: InspeccionData[];
  estadisticas: {
    eficiencia: number;
    problemasRecurrentes: string[];
    mantenimientoRequerido: boolean;
  };
  conductoresAsignados: Array<{
    nombre: string;
    cedula: string;
    inspecciones: number;
  }>;
}

export interface ActiveAlert {
  id: string;
  tipo: 'CRITICA' | 'ADVERTENCIA';
  fecha: string;
  conductor: string;
  vehiculo: string;
  descripcion: string;
  estado: 'ACTIVA' | 'EN_REVISION' | 'RESUELTA';
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
}

class SearchService {
  // 🔍 Búsqueda general de inspecciones
  async searchInspections(filters: SearchFilters): Promise<SearchResult> {
    try {
      const response = await apiClient.get<ApiResponse<SearchResult>>('/search/inspections', {
        params: filters
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error en búsqueda de inspecciones');
    } catch (error) {
      console.error('[SearchService] Error en searchInspections:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 🎯 Búsqueda avanzada con criterios complejos
  async advancedSearch(filters: AdvancedSearchFilters): Promise<SearchResult> {
    try {
      const response = await apiClient.post<ApiResponse<SearchResult>>('/search/advanced', filters);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error en búsqueda avanzada');
    } catch (error) {
      console.error('[SearchService] Error en advancedSearch:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 👨‍💼 Obtener historial específico de conductor
  async getDriverHistory(driverId: string, filters?: {
    fechaInicio?: string;
    fechaFin?: string;
    limite?: number;
  }): Promise<DriverHistory> {
    try {
      const response = await apiClient.get<ApiResponse<DriverHistory>>(`/search/driver/${driverId}`, {
        params: filters
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo historial del conductor');
    } catch (error) {
      console.error('[SearchService] Error en getDriverHistory:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 🚗 Obtener historial específico de vehículo
  async getVehicleHistory(placa: string, filters?: {
    fechaInicio?: string;
    fechaFin?: string;
    limite?: number;
  }): Promise<VehicleHistory> {
    try {
      const response = await apiClient.get<ApiResponse<VehicleHistory>>(`/search/vehicle/${placa}`, {
        params: filters
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo historial del vehículo');
    } catch (error) {
      console.error('[SearchService] Error en getVehicleHistory:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 🚨 Obtener alertas activas y críticas
  async getActiveAlerts(filters?: {
    tipo?: 'CRITICA' | 'ADVERTENCIA' | 'TODAS';
    estado?: 'ACTIVA' | 'EN_REVISION' | 'RESUELTA';
    limite?: number;
  }): Promise<ActiveAlert[]> {
    try {
      const response = await apiClient.get<ApiResponse<ActiveAlert[]>>('/search/alerts', {
        params: filters
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo alertas activas');
    } catch (error) {
      console.error('[SearchService] Error en getActiveAlerts:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📈 Obtener análisis de tendencias
  async getTrends(filters: {
    periodo?: '7days' | '30days' | '90days';
    groupBy?: 'day' | 'week' | 'month';
    metrics?: 'all' | 'fatigue' | 'safety';
  }): Promise<{
    periodo: {
      inicio: string;
      fin: string;
      dias: number;
    };
    tendencias: TrendData[];
    resumen: {
      totalInspecciones: number;
      totalAlertas: number;
      totalAdvertencias: number;
      tasaPromediaAlertas: number;
      tasaPromediaAdvertencias: number;
      puntajePromedioGeneral: number;
    };
    analisisFatiga: {
      totalMedicamentos: number;
      totalSuenoInsuficiente: number;
      totalSintomasFatiga: number;
      totalNoAptos: number;
      tendenciaFatiga: 'mejorando' | 'estable' | 'empeorando';
    };
  }> {
    try {
      const response = await apiClient.get<ApiResponse>('/search/trends', {
        params: filters
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo análisis de tendencias');
    } catch (error) {
      console.error('[SearchService] Error en getTrends:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📊 Obtener resúmenes por categoría
  async getSummary(type: 'conductores' | 'vehiculos' | 'contratos' | 'fatiga', options?: {
    timeframe?: '7days' | '30days' | '90days';
    limit?: number;
  }): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse>(`/search/summary/${type}`, {
        params: options
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data.summary;
      }
      
      throw new Error(response.data.message || 'Error obteniendo resumen');
    } catch (error) {
      console.error('[SearchService] Error en getSummary:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📤 Exportar resultados de búsqueda
  async exportSearchResults(searchParams: any, options: {
    format: 'json' | 'csv' | 'excel' | 'pdf';
    filename?: string;
    includeCharts?: boolean;
    template?: string;
  }): Promise<Blob | any> {
    try {
      const requestData = {
        searchParams,
        ...options
      };

      if (options.format === 'json') {
        const response = await apiClient.post<ApiResponse>('/search/export', requestData);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error(response.data.message || 'Error exportando datos');
      } else {
        // Para otros formatos, esperamos un blob
        const response = await apiClient.post('/search/export', requestData, {
          responseType: 'blob'
        });
        
        return response.data;
      }
    } catch (error) {
      console.error('[SearchService] Error en exportSearchResults:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 🔄 Refrescar cache de búsquedas
  async refreshCache(type?: 'all' | 'inspections' | 'drivers' | 'vehicles'): Promise<boolean> {
    try {
      const response = await apiClient.post<ApiResponse>(`/search/refresh/${type || 'all'}`);
      
      return response.data.success;
    } catch (error) {
      console.error('[SearchService] Error en refreshCache:', error);
      return false;
    }
  }

  // 🔍 Búsqueda rápida (para autocomplete)
  async quickSearch(query: string, type?: 'conductores' | 'vehiculos' | 'contratos'): Promise<Array<{
    id: string;
    label: string;
    type: string;
    extra?: string;
  }>> {
    try {
      // Esta funcionalidad se puede implementar como una extensión del endpoint de búsqueda
      const filters: SearchFilters = {
        limit: 10
      };

      if (type === 'conductores') {
        filters.conductor = query;
      } else if (type === 'vehiculos') {
        filters.placa = query;
      } else if (type === 'contratos') {
        filters.contrato = query;
      }

      const result = await this.searchInspections(filters);
      
      // Procesar resultados para autocomplete
      const suggestions: Array<{id: string; label: string; type: string; extra?: string}> = [];
      
      result.inspecciones.forEach(inspeccion => {
        if (type === 'conductores' || !type) {
          suggestions.push({
            id: inspeccion.conductor_cedula,
            label: inspeccion.conductor_nombre,
            type: 'conductor',
            extra: inspeccion.conductor_cedula
          });
        }
        
        if (type === 'vehiculos' || !type) {
          suggestions.push({
            id: inspeccion.placa_vehiculo,
            label: inspeccion.placa_vehiculo,
            type: 'vehiculo'
          });
        }
        
        if (type === 'contratos' || !type) {
          suggestions.push({
            id: inspeccion.contrato,
            label: inspeccion.contrato,
            type: 'contrato'
          });
        }
      });

      // Eliminar duplicados
      const uniqueSuggestions = suggestions.filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id && t.type === item.type)
      );

      return uniqueSuggestions.slice(0, 10);
    } catch (error) {
      console.error('[SearchService] Error en quickSearch:', error);
      return [];
    }
  }
}

export const searchService = new SearchService();
export default searchService;
