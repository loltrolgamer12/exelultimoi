import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error,
  Warning,
  Visibility,
  Delete,
  Download,
  History,
  Assessment,
  Description,
} from '@mui/icons-material';
import { uploadService, UploadResult, ValidationResult, UploadHistory } from '../../services/uploadService';
import { formatDate, formatNumber } from '../../services/api';

const Upload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // 🔄 Cargar historial al montar
  useEffect(() => {
    loadUploadHistory();
  }, []);

  const loadUploadHistory = async () => {
    try {
      const history = await uploadService.getUploadHistory({ limit: 10 });
      setUploadHistory(Array.isArray(history.uploads) ? history.uploads : []);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setUploadHistory([]);
    }
  };

  // 📁 Manejar selección de archivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar formato
    const validation = uploadService.validateFileFormat(file);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    setSelectedFile(file);
    setValidationResult(null);
    setUploadResult(null);
    setError(null);
    setSuccess(null);
  };

  // ✅ Validar archivo
  const handleValidateFile = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);

      const result = await uploadService.validateFile(selectedFile);
      setValidationResult(result);

      if (result.isValid) {
        setSuccess('Archivo validado correctamente');
      } else {
        setError('El archivo tiene errores de validación');
      }
    } catch (err) {
      console.error('Error validando archivo:', err);
      setError((err as Error)?.message ?? 'Error validando archivo');
    } finally {
      setUploading(false);
    }
  };

  // 📤 Subir archivo
  const handleUploadFile = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      const result = await uploadService.uploadExcelFile(
        selectedFile,
        { overwriteDuplicates: false },
        (progress) => setUploadProgress(progress)
      );

      setUploadResult(result);
      setSuccess(`Archivo procesado exitosamente. ${result.newRecords} registros nuevos agregados.`);
      
      // Recargar historial
      await loadUploadHistory();
      
      // Limpiar formulario
      setSelectedFile(null);
      setValidationResult(null);
      setUploadProgress(0);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      console.error('Error subiendo archivo:', err);
      setError((err as Error)?.message ?? 'Error procesando archivo');
    } finally {
      setUploading(false);
    }
  };

  // 🗑️ Revertir upload
  const handleRevertUpload = async (fileId: string) => {
    try {
      setUploading(true);
      await uploadService.revertUpload(fileId, 'Revertido por el usuario');
      setSuccess('Upload revertido exitosamente');
      await loadUploadHistory();
    } catch (err) {
      console.error('Error revirtiendo upload:', err);
      setError('Error al revertir el upload');
    } finally {
      setUploading(false);
    }
  };

  // 📊 Obtener color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESADO':
        return 'success';
      case 'ERROR':
        return 'error';
      case 'REVERTIDO':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 📤 Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Carga de Archivos Excel
        </Typography>
        <Button
          variant="outlined"
          startIcon={<History />}
          onClick={() => setHistoryOpen(true)}
        >
          Ver Historial
        </Button>
      </Box>

      {/* ⚠️ Mensajes */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 📁 Panel de carga */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Seleccionar Archivo Excel
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Selecciona un archivo Excel (.xlsx o .xls) con los datos de inspecciones vehiculares
              </Typography>

              {/* Input de archivo */}
              <Box sx={{ mb: 3 }}>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="file-input">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    fullWidth
                    sx={{ height: 100, borderStyle: 'dashed' }}
                  >
                    {selectedFile ? selectedFile.name : 'Seleccionar archivo Excel'}
                  </Button>
                </label>
              </Box>

              {/* Información del archivo seleccionado */}
              {selectedFile && (
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Archivo Seleccionado
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <Description />
                        </ListItemIcon>
                        <ListItemText
                          primary={selectedFile.name}
                          secondary={`Tamaño: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              )}

              {/* Resultado de validación */}
              {validationResult && (
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Resultado de Validación
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          {validationResult.isValid ? (
                            <CheckCircle color="success" />
                          ) : (
                            <Error color="error" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={validationResult.isValid ? 'Archivo válido' : 'Archivo con errores'}
                          secondary={
                            validationResult.estimatedRecords 
                              ? `Registros estimados: ${validationResult.estimatedRecords}`
                              : undefined
                          }
                        />
                      </ListItem>
                      {validationResult.detectedYear && (
                        <ListItem>
                          <ListItemIcon>
                            <Assessment />
                          </ListItemIcon>
                          <ListItemText
                            primary={`Año detectado: ${validationResult.detectedYear}`}
                            secondary={
                              validationResult.detectedMonths 
                                ? `Meses: ${validationResult.detectedMonths.join(', ')}`
                                : undefined
                            }
                          />
                        </ListItem>
                      )}
                    </List>

                    {/* Errores */}
                    {(validationResult?.errors?.length ?? 0) > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="error" gutterBottom>
                          Errores encontrados:
                        </Typography>
                        <List dense>
                          {validationResult.errors.map((error, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <Error color="error" />
                              </ListItemIcon>
                              <ListItemText primary={error} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}

                    {/* Advertencias */}
                    {(validationResult?.warnings?.length ?? 0) > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="warning.main" gutterBottom>
                          Advertencias:
                        </Typography>
                        <List dense>
                          {validationResult.warnings.map((warning, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <Warning color="warning" />
                              </ListItemIcon>
                              <ListItemText primary={warning} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Progreso de carga */}
              {uploading && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    {uploadProgress < 100 ? 'Subiendo archivo...' : 'Procesando datos...'}
                  </Typography>
                  <LinearProgress 
                    variant={uploadProgress < 100 ? "determinate" : "indeterminate"} 
                    value={uploadProgress} 
                  />
                  <Typography variant="caption" color="text.secondary">
                    {uploadProgress < 100 ? `${uploadProgress}%` : 'Procesando...'}
                  </Typography>
                </Box>
              )}

              {/* Resultado de carga */}
              {uploadResult && (
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Resultado del Procesamiento
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }} component="span">
                          Total Registros
                        </Typography>
                        <Typography variant="h6" color="primary.main" component="span" sx={{ ml: 1 }}>
                          {uploadResult.totalRecords}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }} component="span">
                          Nuevos
                        </Typography>
                        <Typography variant="h6" color="success.main" component="span" sx={{ ml: 1 }}>
                          {uploadResult.newRecords}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }} component="span">
                          Duplicados
                        </Typography>
                        <Typography variant="h6" color="warning.main" component="span" sx={{ ml: 1 }}>
                          {uploadResult.duplicateRecords}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }} component="span">
                          Tiempo
                        </Typography>
                        <Typography variant="h6" color="info.main" component="span" sx={{ ml: 1 }}>
                          {typeof uploadResult.processingTime === 'number' ? uploadResult.processingTime.toFixed(2) + 's' : 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {/* Botones de acción */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleValidateFile}
                  disabled={!selectedFile || uploading}
                  startIcon={<CheckCircle />}
                >
                  Validar Archivo
                </Button>
                <Button
                  variant="contained"
                  onClick={handleUploadFile}
                  disabled={!!selectedFile === false || !!uploading || (!!validationResult && !validationResult.isValid)}
                  startIcon={<CloudUpload />}
                >
                  Procesar Archivo
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 📋 Panel de información */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Instrucciones
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Description color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Formato de archivo"
                    secondary="Solo archivos Excel (.xlsx, .xls)"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <Assessment color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Tamaño máximo"
                    secondary="50 MB por archivo"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Validación automática"
                    secondary="Se detectan duplicados y errores"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <CloudUpload color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Procesamiento seguro"
                    secondary="Los datos se validan antes de guardar"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Historial reciente */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Uploads Recientes
              </Typography>
              <List dense>
                {(uploadHistory ?? []).slice(0, 3).map((upload) => (
                  <React.Fragment key={upload.id}>
                    <ListItem>
                      <ListItemIcon>
                        <Description />
                      </ListItemIcon>
                      <ListItemText
                          primary={upload.fileName}
                          secondary={
                            <>
                              <Typography variant="caption" component="span" sx={{ mr: 2 }}>
                                {formatDate(upload.uploadDate)}
                              </Typography>
                              <Chip
                                label={upload.status}
                                size="small"
                                color={getStatusColor(upload.status)}
                                sx={{ verticalAlign: 'middle' }}
                              />
                            </>
                          }
                        />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
              {(uploadHistory ?? []).length > 3 && (
                <Button
                  size="small"
                  onClick={() => setHistoryOpen(true)}
                >
                  Ver todos
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 📊 Dialog de historial */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Historial de Uploads
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Archivo</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Registros</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(uploadHistory ?? []).map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell>{upload.fileName}</TableCell>
                    <TableCell>{formatDate(upload.uploadDate)}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          Total: {upload.totalRecords}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Nuevos: {upload.newRecords} | Duplicados: {upload.duplicateRecords}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={upload.status}
                        size="small"
                        color={getStatusColor(upload.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Ver detalles">
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      {upload.status === 'PROCESADO' && (
                        <Tooltip title="Revertir">
                          <IconButton 
                            size="small" 
                            onClick={() => handleRevertUpload(upload.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Upload;
