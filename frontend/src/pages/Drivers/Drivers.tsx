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
  Avatar,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Badge,
} from '@mui/material';
import {
  Person,
  Search as SearchIcon,
  Visibility,
  Warning,
  Error,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  LocalHospital,
  Bedtime,
  Psychology,
  FitnessCenter,
  History,
  Assessment,
  Close,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { searchService, DriverHistory } from '../../services/searchService';
import { formatDate, formatNumber } from '../../services/api';

interface DriverSummary {
  cedula: string;
  nombre: string;
  totalInspecciones: number;
  alertasRojas: number;
  advertencias: number;
  eficiencia: number;
  ultimaInspeccion: string;
  tendencia: 'mejorando' | 'estable' | 'empeorando';
  problemasRecurrentes: string[];
}

const Drivers: React.FC = () => {
  const { driverId } = useParams<{ driverId?: string }>();
  const [drivers, setDrivers] = useState<DriverSummary[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // 🔄 Cargar lista de conductores
  useEffect(() => {
    loadDrivers();
  }, []);

  // 🔍 Cargar detalles de conductor específico si se proporciona ID
  useEffect(() => {
    if (driverId) {
      loadDriverDetails(driverId);
    }
  }, [driverId]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Implementar endpoint para obtener resumen de conductores
      // Por ahora, datos simulados
      const mockDrivers: DriverSummary[] = [
        {
          cedula: '12345678',
          nombre: 'Juan Carlos Pérez',
          totalInspecciones: 45,
          alertasRojas: 2,
          advertencias: 8,
          eficiencia: 82.2,
          ultimaInspeccion: '2024-01-15',
          tendencia: 'mejorando',
          problemasRecurrentes: ['Sueño insuficiente', 'Síntomas de fatiga'],
        },
        {
          cedula: '87654321',
          nombre: 'María García López',
          totalInspecciones: 38,
          alertasRojas: 0,
          advertencias: 3,
          eficiencia: 92.1,
          ultimaInspeccion: '2024-01-14',
          tendencia: 'estable',
          problemasRecurrentes: [],
        },
        {
          cedula: '11223344',
          nombre: 'Carlos Rodríguez',
          totalInspecciones: 52,
          alertasRojas: 5,
          advertencias: 12,
          eficiencia: 67.3,
          ultimaInspeccion: '2024-01-13',
          tendencia: 'empeorando',
          problemasRecurrentes: ['Consumo medicamentos', 'No apto', 'Sueño insuficiente'],
        },
      ];

      setDrivers(mockDrivers);
    } catch (err) {
      console.error('Error cargando conductores:', err);
      setError((err as Error).message ?? 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const loadDriverDetails = async (cedula: string) => {
    try {
      setLoading(true);
      const details = await searchService.getDriverHistory(cedula);
      setSelectedDriver(details);
      setDetailsOpen(true);
    } catch (err) {
      console.error('Error cargando detalles del conductor:', err);
      setError((err as Error).message ?? 'Error cargando detalles');
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Filtrar conductores
  const filteredDrivers = drivers.filter(driver =>
    driver.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.cedula.includes(searchTerm)
  );

  // 📄 Paginación
  const paginatedDrivers = filteredDrivers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 🎨 Obtener color de eficiencia
  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'success';
    if (efficiency >= 75) return 'warning';
    return 'error';
  };

  // 📈 Obtener icono de tendencia
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'mejorando':
        return <TrendingUp color="success" />;
      case 'empeorando':
        return <TrendingDown color="error" />;
      default:
        return <TrendingUp color="disabled" />;
    }
  };

  // 🚨 Obtener icono de problema
  const getProblemIcon = (problema: string) => {
    if (problema.includes('medicamentos')) return <LocalHospital color="error" />;
    if (problema.includes('Sueño')) return <Bedtime color="warning" />;
    if (problema.includes('fatiga')) return <Psychology color="warning" />;
    if (problema.includes('apto')) return <FitnessCenter color="error" />;
    return <Warning color="warning" />;
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 👨‍💼 Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Gestión de Conductores
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Total: {filteredDrivers.length} conductores
          </Typography>
        </Box>
      </Box>

      {/* 🔍 Búsqueda */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            label="Buscar conductor"
            placeholder="Nombre o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </CardContent>
      </Card>

      {/* ⚠️ Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 📊 Estadísticas rápidas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Person />
                </Avatar>
                <Box>
                  <Typography variant="h6">{filteredDrivers.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Conductores
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {filteredDrivers.filter(d => d.eficiencia >= 90).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Excelente Desempeño
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Warning />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {filteredDrivers.filter(d => d.eficiencia < 75).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Requieren Atención
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                  <Error />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {filteredDrivers.filter(d => d.alertasRojas > 0).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Con Alertas Críticas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 📋 Tabla de conductores */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Conductor</TableCell>
                  <TableCell>Inspecciones</TableCell>
                  <TableCell>Alertas</TableCell>
                  <TableCell>Eficiencia</TableCell>
                  <TableCell>Tendencia</TableCell>
                  <TableCell>Última Inspección</TableCell>
                  <TableCell>Problemas</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedDrivers.map((driver) => (
                  <TableRow key={driver.cedula} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>
                          {driver.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {driver.nombre}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {driver.cedula}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {driver.totalInspecciones}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {driver.alertasRojas > 0 && (
                          <Badge badgeContent={driver.alertasRojas} color="error">
                            <Error color="error" />
                          </Badge>
                        )}
                        {driver.advertencias > 0 && (
                          <Badge badgeContent={driver.advertencias} color="warning">
                            <Warning color="warning" />
                          </Badge>
                        )}
                        {driver.alertasRojas === 0 && driver.advertencias === 0 && (
                          <CheckCircle color="success" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={500} sx={{ mr: 1 }}>
                            {driver.eficiencia.toFixed(1)}%
                          </Typography>
                          <Chip
                            size="small"
                            label={
                              driver.eficiencia >= 90 ? 'Excelente' :
                              driver.eficiencia >= 75 ? 'Bueno' : 'Requiere Atención'
                            }
                            color={getEfficiencyColor(driver.eficiencia)}
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={driver.eficiencia}
                          color={getEfficiencyColor(driver.eficiencia)}
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getTrendIcon(driver.tendencia)}
                        <Typography variant="caption" sx={{ ml: 0.5, textTransform: 'capitalize' }}>
                          {driver.tendencia}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(driver.ultimaInspeccion)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {driver.problemasRecurrentes.length === 0 ? (
                          <Chip label="Sin problemas" size="small" color="success" />
                        ) : (
                          driver.problemasRecurrentes.slice(0, 2).map((problema, index) => (
                            <Tooltip key={index} title={problema}>
                              <Chip
                                label={problema.substring(0, 10) + '...'}
                                size="small"
                                color="warning"
                                icon={getProblemIcon(problema)}
                              />
                            </Tooltip>
                          ))
                        )}
                        {driver.problemasRecurrentes.length > 2 && (
                          <Chip
                            label={`+${driver.problemasRecurrentes.length - 2}`}
                            size="small"
                            color="default"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Ver historial completo">
                        <IconButton
                          size="small"
                          onClick={() => loadDriverDetails(driver.cedula)}
                        >
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
            count={filteredDrivers.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
            }
          />
        </CardContent>
      </Card>

      {/* 📊 Dialog de detalles del conductor */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Historial del Conductor
            </Typography>
            <IconButton onClick={() => setDetailsOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDriver && (
            <Box>
              {/* Información del conductor */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ mr: 2, width: 56, height: 56, bgcolor: 'primary.main' }}>
                          <Person />
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {selectedDriver.conductor.nombre}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Cédula: {selectedDriver.conductor.cedula}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Total Inspecciones
                          </Typography>
                          <Typography variant="h6">
                            {selectedDriver.conductor.totalInspecciones}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Eficiencia
                          </Typography>
                          <Typography variant="h6" color={
                            selectedDriver.estadisticas.eficiencia >= 90 ? 'success.main' :
                            selectedDriver.estadisticas.eficiencia >= 75 ? 'warning.main' : 'error.main'
                          }>
                            {selectedDriver.estadisticas.eficiencia.toFixed(1)}%
                          </Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Estadísticas de fatiga */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Análisis de Fatiga
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <LocalHospital color="error" sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant="h6" color="error.main">
                          {selectedDriver.alertasFatiga.medicamentos}
                        </Typography>
                        <Typography variant="caption">
                          Medicamentos
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Bedtime color="warning" sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant="h6" color="warning.main">
                          {selectedDriver.alertasFatiga.suenoInsuficiente}
                        </Typography>
                        <Typography variant="caption">
                          Sueño Insuficiente
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Psychology color="warning" sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant="h6" color="warning.main">
                          {selectedDriver.alertasFatiga.sintomasFatiga}
                        </Typography>
                        <Typography variant="caption">
                          Síntomas Fatiga
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <FitnessCenter color="error" sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant="h6" color="error.main">
                          {selectedDriver.alertasFatiga.noApto}
                        </Typography>
                        <Typography variant="caption">
                          No Apto
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Problemas recurrentes */}
              {selectedDriver.estadisticas.problemasRecurrentes.length > 0 && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Problemas Recurrentes
                    </Typography>
                    <List dense>
                      {selectedDriver.estadisticas.problemasRecurrentes.map((problema, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            {getProblemIcon(problema)}
                          </ListItemIcon>
                          <ListItemText primary={problema} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}

              {/* Historial reciente */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Inspecciones Recientes
                  </Typography>
                  <List>
                    {selectedDriver.historial.slice(0, 5).map((inspeccion, index) => (
                      <React.Fragment key={inspeccion.id}>
                        <ListItem>
                          <ListItemIcon>
                            {inspeccion.tiene_alerta_roja ? (
                              <Error color="error" />
                            ) : inspeccion.tiene_advertencias ? (
                              <Warning color="warning" />
                            ) : (
                              <CheckCircle color="success" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={`${formatDate(inspeccion.fecha)} - ${inspeccion.placa_vehiculo}`}
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  Puntaje: {inspeccion.puntaje_total}/100
                                </Typography>
                                {inspeccion.observaciones && (
                                  <Typography variant="caption" color="text.secondary">
                                    {inspeccion.observaciones}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < selectedDriver.historial.slice(0, 5).length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Drivers;
