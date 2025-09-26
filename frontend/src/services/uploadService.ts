import { apiClient, ApiResponse, handleApiError } from './api';

export interface UploadResult {
  success: boolean;
  fileName: string;
  fileHash: string;
  totalRecords: number;
  newRecords: number;
  duplicateRecords: number;
  processingTime: number;
  detectedYear: number;
  detectedMonths: number[];
  validationErrors?: string[];
  warnings?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  fileName: string;
  fileSize: number;
  detectedYear?: number;
  detectedMonths?: number[];
  estimatedRecords?: number;
  errors: string[];
  warnings: string[];
  recommendations?: string[];
}

export interface UploadHistory {
  id: string;
  fileName: string;
  uploadDate: string;
  totalRecords: number;
  newRecords: number;
  duplicateRecords: number;
  processingTime: number;
  status: 'PROCESADO' | 'ERROR' | 'REVERTIDO';
  user?: string;
}

export interface UploadStats {
  totalUploads: number;
  totalRecordsProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  lastUpload?: string;
  monthlyStats: Array<{
    month: string;
    uploads: number;
    records: number;
  }>;
}

export interface ExcelTemplate {
  name: string;
  description: string;
  version: string;
  requiredColumns: string[];
  optionalColumns: string[];
  downloadUrl: string;
}

class UploadService {
  // 📤 Validar archivo Excel antes de procesar
  async validateFile(file: File): Promise<ValidationResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post<ApiResponse<ValidationResult>>('/upload/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 1 minuto para validación
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error validando archivo');
    } catch (error) {
      console.error('[UploadService] Error en validateFile:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 🚀 Procesar archivo Excel
  async uploadExcelFile(
    file: File, 
    options?: {
      overwriteDuplicates?: boolean;
      validateOnly?: boolean;
      batchSize?: number;
    },
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (options?.overwriteDuplicates) {
        formData.append('overwriteDuplicates', 'true');
      }
      if (options?.validateOnly) {
        formData.append('validateOnly', 'true');
      }
      if (options?.batchSize) {
        formData.append('batchSize', options.batchSize.toString());
      }
      
  const response = await apiClient.post<ApiResponse<UploadResult>>('/upload/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutos para procesamiento
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error procesando archivo Excel');
    } catch (error) {
      console.error('[UploadService] Error en uploadExcelFile:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📊 Obtener historial de archivos procesados
  async getUploadHistory(filters?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    status?: 'PROCESADO' | 'ERROR' | 'REVERTIDO';
  }): Promise<{
    uploads: UploadHistory[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const response = await apiClient.get<ApiResponse>('/upload/history', {
        params: filters
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo historial de uploads');
    } catch (error) {
      console.error('[UploadService] Error en getUploadHistory:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 🗑️ Revertir procesamiento de archivo
  async revertUpload(fileId: string, reason?: string): Promise<boolean> {
    try {
      const response = await apiClient.delete<ApiResponse>(`/upload/revert/${fileId}`, {
        data: { reason }
      });
      
      return response.data.success;
    } catch (error) {
      console.error('[UploadService] Error en revertUpload:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📈 Obtener estadísticas de uploads
  async getUploadStats(period?: '7days' | '30days' | '90days' | '1year'): Promise<UploadStats> {
    try {
      const response = await apiClient.get<ApiResponse<UploadStats>>('/upload/stats', {
        params: { period }
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo estadísticas de uploads');
    } catch (error) {
      console.error('[UploadService] Error en getUploadStats:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📊 Obtener plantillas de Excel disponibles
  async getExcelTemplates(): Promise<ExcelTemplate[]> {
    try {
      const response = await apiClient.get<ApiResponse<ExcelTemplate[]>>('/upload/templates');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo plantillas Excel');
    } catch (error) {
      console.error('[UploadService] Error en getExcelTemplates:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📥 Descargar plantilla de Excel
  async downloadTemplate(templateName: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`/upload/templates/${templateName}`, {
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      console.error('[UploadService] Error en downloadTemplate:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 🔍 Validar formato de archivo
  validateFileFormat(file: File): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Validar extensión
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`Formato de archivo no válido. Se permiten: ${allowedExtensions.join(', ')}`);
    }
    
    // Validar tamaño (máximo 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      errors.push(`El archivo es demasiado grande. Tamaño máximo: 50MB`);
    }
    
    // Validar tamaño mínimo
    const minSize = 1024; // 1KB
    if (file.size < minSize) {
      errors.push('El archivo está vacío o es demasiado pequeño');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 📊 Obtener progreso de procesamiento (para archivos grandes)
  async getProcessingProgress(uploadId: string): Promise<{
    status: 'PROCESSING' | 'COMPLETED' | 'ERROR';
    progress: number;
    currentStep: string;
    estimatedTimeRemaining?: number;
    recordsProcessed?: number;
    totalRecords?: number;
  }> {
    try {
      const response = await apiClient.get<ApiResponse>(`/upload/progress/${uploadId}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo progreso');
    } catch (error) {
      console.error('[UploadService] Error en getProcessingProgress:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 🔄 Reintentar procesamiento fallido
  async retryFailedUpload(fileId: string): Promise<UploadResult> {
    try {
      const response = await apiClient.post<ApiResponse<UploadResult>>(`/upload/retry/${fileId}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error reintentando procesamiento');
    } catch (error) {
      console.error('[UploadService] Error en retryFailedUpload:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 📋 Obtener detalles de un upload específico
  async getUploadDetails(fileId: string): Promise<{
    upload: UploadHistory;
    validationDetails: ValidationResult;
    processingLog: Array<{
      timestamp: string;
      level: 'INFO' | 'WARNING' | 'ERROR';
      message: string;
    }>;
    sampleData?: any[];
  }> {
    try {
      const response = await apiClient.get<ApiResponse>(`/upload/details/${fileId}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error obteniendo detalles del upload');
    } catch (error) {
      console.error('[UploadService] Error en getUploadDetails:', error);
      throw new Error(handleApiError(error));
    }
  }

  // 🧹 Limpiar uploads antiguos
  async cleanupOldUploads(olderThanDays: number = 90): Promise<{
    deletedCount: number;
    freedSpace: number;
  }> {
    try {
      const response = await apiClient.post<ApiResponse>('/upload/cleanup', {
        olderThanDays
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error limpiando uploads antiguos');
    } catch (error) {
      console.error('[UploadService] Error en cleanupOldUploads:', error);
      throw new Error(handleApiError(error));
    }
  }
}

export const uploadService = new UploadService();
export default uploadService;