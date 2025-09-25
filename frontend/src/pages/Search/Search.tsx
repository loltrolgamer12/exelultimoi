import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  Badge,
  Autocomplete,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList,
  Clear,
  Download,
  Visibility,
  Warning,
  Error,
  CheckCircle,
  ExpandMore,
  Refresh,
  CalendarToday,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { searchService, SearchResult, AdvancedSearchFilters } from '../../services/searchService';
import { SearchFilters } from '../../services/api';
import { InspeccionData, formatDate, formatNumber } from '../../services/api';

const Search: React.FC = () => {
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 🔍 Filtros básicos
  const [basicFilters, setBasicFilters] = useState<SearchFilters>({
    page: 0,
    limit: 25,
  });

  // 🎯 Filtros avanzados
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchFilters>({
    ...basicFilters,
    ordenarPor: 'fecha',
    orden: 'desc',
  });

  // 📊 Opciones para autocomplete
  const [contractOptions, setContractOptions] = useState<string[]>([]);
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);
  const [driverOptions, setDriverOptions] = useState<Array<{label: string; id: string}>>([]);

  // 🔄 Cargar opciones para filtros
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        // TODO: Implementar carga de opciones desde la API
        setContractOptions(['CONTRATO_A', 'CONTRATO_B', 'CONTRATO_C']);
        setFieldOptions(['CAMPO_1', 'CAMPO_2', 'CAMPO_3']);
        setDriverOptions([
          { label: 'Juan Pérez', id: '12345678' },
          { label: 'María García', id: '87654321' },
        ]);
      } catch (error) {
        console.error('Error cargando opciones de filtros:', error);
      }
    };

    loadFilterOptions();
  }, []);

  // 🔍 Ejecutar búsqueda
  const handleSearch = async (useAdvanced: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const filters = useAdvanced ? advancedFilters : basicFilters;
      filters.page = page;
      filters.limit = rowsPerPage;

      let results: SearchResult;
      if (useAdvanced) {
        results = await searchService.advancedSearch(filters as AdvancedSearchFilters);
      } else {
        results = await searchService.searchInspections(filters);
      }

      setSearchResults(results);
    } catch (err) {
      console.error('Error en búsqueda:', err);
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setError((err as any).message);
      } else {
        setError('Error desconocido');
      }
    } finally {
      setLoading(false);
    }
  };

  // 🧹 Limpiar filtros
  const handleClearFilters = () => {
    const clearedFilters: SearchFilters = {
      page: 0,
      limit: rowsPerPage,
    };
    setBasicFilters(clearedFilters);
    setAdvancedFilters({
      ...clearedFilters,
      ordenarPor: 'fecha',
      orden: 'desc',
    });
    setPage(0);
    setSearchResults(null);
  };

  // 📄 Cambiar página
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    // Auto-ejecutar búsqueda con nueva página
    setTimeout(() => handleSearch(showAdvanced), 100);
  };

  // 📊 Cambiar filas por página
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    
    // Actualizar filtros
    setBasicFilters(prev => ({ ...prev, limit: newRowsPerPage, page: 0 }));
    setAdvancedFilters(prev => ({ ...prev, limit: newRowsPerPage, page: 0 }));
  };

  // 🎨 Obtener color del estado
  const getStatusColor = (inspeccion: InspeccionData) => {
    if (inspeccion.tiene_alerta_roja) return 'error';
    if (inspeccion.tiene_advertencias) return 'warning';
    return 'success';
  };

  // 📤 Exportar resultados
  const handleExport = async (format: 'json' | 'csv' | 'excel' | 'pdf') => {
    try {
      setLoading(true);
      const searchParams = showAdvanced ? advancedFilters : basicFilters;
      
      const result = await searchService.exportSearchResults(searchParams, {
        format,
        filename: `inspecciones_${new Date().toISOString().split('T')[0]}.${format}`,
      });

      if (format === 'json') {
        // Descargar JSON
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inspecciones_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Para otros formatos, el resultado es un blob
        const url = URL.createObjectURL(result as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inspecciones_${new Date().toISOString().split('T')[0]}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exportando:', error);
      setError('Error al exportar los datos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ flexGrow: 1 }}>
        {/* 🔍 Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Búsqueda de Inspecciones
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Limpiar filtros">
              <IconButton onClick={handleClearFilters}>
                <Clear />
              </IconButton>
            </Tooltip>
            <Tooltip title="Actualizar">
              <IconButton onClick={() => handleSearch(showAdvanced)} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 📋 Panel de filtros */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            {/* Filtros básicos */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Buscar texto"
                  placeholder="Conductor, placa, observaciones..."
                  value={basicFilters.conductor || ''}
                  onChange={(e) => setBasicFilters(prev => ({ ...prev, conductor: e.target.value }))}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="Fecha inicio"
                  value={basicFilters.fechaInicio ? new Date(basicFilters.fechaInicio) : null}
                  onChange={(date) => setBasicFilters(prev => ({ 
                    ...prev, 
                    fechaInicio: date?.toISOString().split('T')[0] 
                  }))}
                  slotProps={{ textField: { fullWidth: true, size: 'medium' } }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="Fecha fin"
                  value={basicFilters.fechaFin ? new Date(basicFilters.fechaFin) : null}
                  onChange={(date) => setBasicFilters(prev => ({ 
                    ...prev, 
                    fechaFin: date?.toISOString().split('T')[0] 
                  }))}
                  slotProps={{ textField: { fullWidth: true, size: 'medium' } }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Autocomplete
                  options={contractOptions}
                  value={basicFilters.contrato || ''}
                  onChange={(_, value) => setBasicFilters(prev => ({ ...prev, contrato: value || undefined }))}
                  renderInput={(params) => <TextField {...params} label="Contrato" />}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Autocomplete
                  options={fieldOptions}
                  value={basicFilters.campo || ''}
                  onChange={(_, value) => setBasicFilters(prev => ({ ...prev, campo: value || undefined }))}
                  renderInput={(params) => <TextField {...params} label="Campo" />}
                />
              </Grid>
              <Grid item xs={12} md={1}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handleSearch(false)}
                  disabled={loading}
                  sx={{ height: '56px' }}
                >
                  {loading ? <CircularProgress size={24} /> : <SearchIcon />}
                </Button>
              </Grid>
            </Grid>

            {/* Filtros rápidos */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                label="Solo alertas críticas"
                color={basicFilters.tieneAlertas ? 'error' : 'default'}
                onClick={() => setBasicFilters(prev => ({ ...prev, tieneAlertas: !prev.tieneAlertas }))}
                variant={basicFilters.tieneAlertas ? 'filled' : 'outlined'}
              />
              <Chip
                label="Solo advertencias"
                color={basicFilters.tieneAdvertencias ? 'warning' : 'default'}
                onClick={() => setBasicFilters(prev => ({ ...prev, tieneAdvertencias: !prev.tieneAdvertencias }))}
                variant={basicFilters.tieneAdvertencias ? 'filled' : 'outlined'}
              />
              <Chip
                label="Problemas de fatiga"
                color={basicFilters.soloFatiga ? 'secondary' : 'default'}
                onClick={() => setBasicFilters(prev => ({ ...prev, soloFatiga: !prev.soloFatiga }))}
                variant={basicFilters.soloFatiga ? 'filled' : 'outlined'}
              />
            </Box>

            {/* Filtros avanzados */}
            <Accordion expanded={showAdvanced} onChange={() => setShowAdvanced(!showAdvanced)}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FilterList sx={{ mr: 1 }} />
                  <Typography>Filtros Avanzados</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Puntaje mínimo"
                      type="number"
                      value={advancedFilters.puntajeMinimo || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ 
                        ...prev, 
                        puntajeMinimo: e.target.value ? Number(e.target.value) : undefined 
                      }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Puntaje máximo"
                      type="number"
                      value={advancedFilters.puntajeMaximo || ''}
                      onChange={(e) => setAdvancedFilters(prev => ({ 
                        ...prev, 
                        puntajeMaximo: e.target.value ? Number(e.target.value) : undefined 
                      }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Tipo de problema</InputLabel>
                      <Select
                        value={advancedFilters.tipoProblema || ''}
                        onChange={(e) => setAdvancedFilters(prev => ({ 
                          ...prev, 
                          tipoProblema: e.target.value as any || undefined 
                        }))}
                      >
                        <MenuItem value="">Todos</MenuItem>
                        <MenuItem value="medicamentos">Medicamentos</MenuItem>
                        <MenuItem value="sueno">Sueño insuficiente</MenuItem>
                        <MenuItem value="fatiga">Síntomas de fatiga</MenuItem>
                        <MenuItem value="aptitud">No apto para conducir</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Ordenar por</InputLabel>
                      <Select
                        value={advancedFilters.ordenarPor || 'fecha'}
                        onChange={(e) => setAdvancedFilters(prev => ({ 
                          ...prev, 
                          ordenarPor: e.target.value as any 
                        }))}
                      >
                        <MenuItem value="fecha">Fecha</MenuItem>
                        <MenuItem value="puntaje">Puntaje</MenuItem>
                        <MenuItem value="conductor">Conductor</MenuItem>
                        <MenuItem value="vehiculo">Vehículo</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => handleSearch(true)}
                    disabled={loading}
                  >
                    Búsqueda Avanzada
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setAdvancedFilters({ ...basicFilters, ordenarPor: 'fecha', orden: 'desc' })}
                  >
                    Limpiar Avanzados
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>

        {/* ⚠️ Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 📊 Resultados */}
        {searchResults && (
          <Card>
            <CardContent>
              {/* Header de resultados */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Resultados de búsqueda
                  <Badge badgeContent={searchResults.totalFound} color="primary" sx={{ ml: 2 }} />
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<Download />}
                    onClick={() => handleExport('json')}
                  >
                    JSON
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Download />}
                    onClick={() => handleExport('csv')}
                  >
                    CSV
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Download />}
                    onClick={() => handleExport('excel')}
                  >
                    Excel
                  </Button>
                </Box>
              </Box>

              {/* Tabla de resultados */}
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Estado</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Conductor</TableCell>
                      <TableCell>Vehículo</TableCell>
                      <TableCell>Contrato</TableCell>
                      <TableCell>Campo</TableCell>
                      <TableCell>Puntaje</TableCell>
                      <TableCell>Fatiga</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchResults.inspecciones.map((inspeccion) => (
                      <TableRow key={inspeccion.id} hover>
                        <TableCell>
                          <Tooltip title={
                            inspeccion.tiene_alerta_roja ? 'Alerta crítica' :
                            inspeccion.tiene_advertencias ? 'Advertencia' : 'Sin problemas'
                          }>
                            <Box>
                              {inspeccion.tiene_alerta_roja ? (
                                <Error color="error" />
                              ) : inspeccion.tiene_advertencias ? (
                                <Warning color="warning" />
                              ) : (
                                <CheckCircle color="success" />
                              )}
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{formatDate(inspeccion.fecha)}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {inspeccion.conductor_nombre}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {inspeccion.conductor_cedula}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={inspeccion.placa_vehiculo}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{inspeccion.contrato}</TableCell>
                        <TableCell>{inspeccion.campo}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${inspeccion.puntaje_total}/100`}
                            size="small"
                            color={inspeccion.puntaje_total >= 85 ? 'success' : 
                                   inspeccion.puntaje_total >= 70 ? 'warning' : 'error'}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {inspeccion.consumo_medicamentos && (
                              <Tooltip title="Consumo de medicamentos">
                                <Chip label="M" size="small" color="error" />
                              </Tooltip>
                            )}
                            {!inspeccion.horas_sueno_suficientes && (
                              <Tooltip title="Sueño insuficiente">
                                <Chip label="S" size="small" color="warning" />
                              </Tooltip>
                            )}
                            {!inspeccion.libre_sintomas_fatiga && (
                              <Tooltip title="Síntomas de fatiga">
                                <Chip label="F" size="small" color="warning" />
                              </Tooltip>
                            )}
                            {!inspeccion.condiciones_aptas && (
                              <Tooltip title="No apto">
                                <Chip label="A" size="small" color="error" />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Ver detalles">
                            <IconButton size="small">
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Paginación */}
              <TablePagination
                component="div"
                count={searchResults.totalFound}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Filas por página:"
                labelDisplayedRows={({ from, to, count }) => 
                  `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
                }
              />
            </CardContent>
          </Card>
        )}

        {/* 📊 Estado inicial */}
        {!searchResults && !loading && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Realiza una búsqueda para ver los resultados
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Utiliza los filtros para encontrar inspecciones específicas
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default Search;
