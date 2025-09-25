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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  DirectionsCar,
  Search as SearchIcon,
  Visibility,
  Warning,
  Error,
  CheckCircle,
  Build,
  Schedule,
  Person,
  Assessment,
  Close,
  FilterList,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { searchService, VehicleHistory } from '../../services/searchService';
import { formatDate, formatNumber } from '../../services/api';

interface VehicleSummary {
  placa: string;
  totalInspecciones: number;
  alertasRojas: number;
  advertencias: number;
  eficiencia: number;
  ultimaInspeccion: string;
  mantenimientoRequerido: boolean;
  problemasRecurrentes: string[];
  conductoresAsignados: number;
  estado: 'operativo' | 'mantenimiento' | 'critico';
}

const Vehicles: React.FC = () => {
  const { placa } = useParams<{ placa?: string }>();
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // 🔄 Cargar lista de vehículos
  useEffect(() => {
    loadVehicles();
  }, []);

  // 🔍 Cargar detalles de vehículo específico si se proporciona placa
  useEffect(() => {
    if (placa) {
      loadVehicleDetails(placa);
    }
  }, [placa]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Implementar endpoint para obtener resumen de vehículos
      // Por ahora, datos simulados
      const mockVehicles: VehicleSummary[] = [
        {
          placa: 'ABC-123',
          totalInspecciones: 42,
          alertasRojas: 1,
          advertencias: 5,
          eficiencia: 88.1,
          ultimaInspeccion: '2024-01-15',
          mantenimientoRequerido: false,
          problemasRecurrentes: ['Frenos', 'Llantas'],
          conductoresAsignados: 3,
          estado: 'operativo',
        },
        {
          placa: 'DEF-456',
          totalInspecciones: 38,
          alertasRojas: 0,
          advertencias: 2,
          eficiencia: 94.7,
          ultimaInspeccion: '2024-01-14',
          mantenimientoRequerido: false,
          problemasRecurrentes: [],
          conductoresAsignados: 2,
          estado: 'operativo',
        },
        {
          placa: 'GHI-789',
          totalInspecciones: 35,
          alertasRojas: 4,
          advertencias: 8,
          eficiencia: 65.7,
          ultimaInspeccion: '2024-01-13',
          mantenimientoRequerido: true,
          problemasRecurrentes: ['Motor', 'Frenos', 'Suspensión', 'Dirección'],
          conductoresAsignados: 4,
          estado: 'mantenimiento',
        },
        {
          placa: 'JKL-012',
          totalInspecciones: 29,
          alertasRojas: 7,
          advertencias: 12,
          eficiencia: 48.3,
          ultimaInspeccion: '2024-01-12',
          mantenimientoRequerido: true,
          problemasRecurrentes: ['Motor', 'Frenos', 'Transmisión', 'Suspensión', 'Eléctrico'],
          conductoresAsignados: 2,
          estado: 'critico',
        },
      ];

      setVehicles(mockVehicles);
    } catch (err) {
      console.error('Error cargando vehículos:', err);
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Error desconocido');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadVehicleDetails = async (vehiclePlaca: string) => {
    try {
      setLoading(true);
      const details = await searchService.getVehicleHistory(vehiclePlaca);
      setSelectedVehicle(details);
      setDetailsOpen(true);
    } catch (err) {
      console.error('Error cargando detalles del vehículo:', err);
      setError(
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as { message: string }).message
          : 'Error cargando detalles'
      );
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Filtrar vehículos
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.placa.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || vehicle.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 📄 Paginación
  const paginatedVehicles = filteredVehicles.slice(
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

  // 🚗 Obtener color del estado
  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'operativo':
        return 'success';
      case 'mantenimiento':
        return 'warning';
      case 'critico':
        return 'error';
      default:
        return 'default';
    }
  };

  // 🔧 Obtener icono del problema
  const getProblemIcon = (problema: string) => {
    if (problema.includes('Motor')) return <Build color="error" />;
    if (problema.includes('Frenos')) return <Warning color="error" />;
    if (problema.includes('Llantas')) return <DirectionsCar color="warning" />;
    return <Warning color="warning" />;
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 🚗 Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Gestión de Vehículos
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Total: {filteredVehicles.length} vehículos
          </Typography>
        </Box>
      </Box>

      {/* 🔍 Búsqueda y filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Buscar vehículo"
                placeholder="Placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  startAdornment={<FilterList sx={{ mr: 1, color: 'text.secondary' }} />}
                >
                  <MenuItem value="todos">Todos los estados</MenuItem>
                  <MenuItem value="operativo">Operativo</MenuItem>
                  <MenuItem value="mantenimiento">En Mantenimiento</MenuItem>
                  <MenuItem value="critico">Estado Crítico</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('todos');
                }}
              >
                Limpiar
              </Button>
            </Grid>
          </Grid>
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
                  <DirectionsCar />
                </Avatar>
                <Box>
                  <Typography variant="h6">{filteredVehicles.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Vehículos
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
                    {filteredVehicles.filter(v => v.estado === 'operativo').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Operativos
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
                  <Build />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {filteredVehicles.filter(v => v.mantenimientoRequerido).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Requieren Mantenimiento
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
                    {filteredVehicles.filter(v => v.estado === 'critico').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estado Crítico
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 📋 Tabla de vehículos */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Vehículo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Inspecciones</TableCell>
                  <TableCell>Alertas</TableCell>
                  <TableCell>Eficiencia</TableCell>
                  <TableCell>Conductores</TableCell>
                  <TableCell>Última Inspección</TableCell>
                  <TableCell>Problemas</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedVehicles.map((vehicle) => (
                  <TableRow key={vehicle.placa} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>
                          <DirectionsCar />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {vehicle.placa}
                          </Typography>
                          {vehicle.mantenimientoRequerido && (
                            <Chip
                              label="Mantenimiento"
                              size="small"
                              color="warning"
                              icon={<Build />}
                            />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={vehicle.estado.charAt(0).toUpperCase() + vehicle.estado.slice(1)}
                        color={getStatusColor(vehicle.estado)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {vehicle.totalInspecciones}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {vehicle.alertasRojas > 0 && (
                          <Badge badgeContent={vehicle.alertasRojas} color="error">
                            <Error color="error" />
                          </Badge>
                        )}
                        {vehicle.advertencias > 0 && (
                          <Badge badgeContent={vehicle.advertencias} color="warning">
                            <Warning color="warning" />
                          </Badge>
                        )}
                        {vehicle.alertasRojas === 0 && vehicle.advertencias === 0 && (
                          <CheckCircle color="success" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={500} sx={{ mr: 1 }}>
                            {vehicle.eficiencia.toFixed(1)}%
                          </Typography>
                          <Chip
                            size="small"
                            label={
                              vehicle.eficiencia >= 90 ? 'Excelente' :
                              vehicle.eficiencia >= 75 ? 'Bueno' : 'Requiere Atención'
                            }
                            color={getEfficiencyColor(vehicle.eficiencia)}
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={vehicle.eficiencia}
                          color={getEfficiencyColor(vehicle.eficiencia)}
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Person sx={{ mr: 0.5, fontSize: 16 }} />
                        <Typography variant="body2">
                          {vehicle.conductoresAsignados}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(vehicle.ultimaInspeccion)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {vehicle.problemasRecurrentes.length === 0 ? (
                          <Chip label="Sin problemas" size="small" color="success" />
                        ) : (
                          vehicle.problemasRecurrentes.slice(0, 2).map((problema, index) => (
                            <Tooltip key={index} title={problema}>
                              <Chip
                                label={problema}
                                size="small"
                                color="warning"
                                icon={getProblemIcon(problema)}
                              />
                            </Tooltip>
                          ))
                        )}
                        {vehicle.problemasRecurrentes.length > 2 && (
                          <Chip
                            label={`+${vehicle.problemasRecurrentes.length - 2}`}
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
                          onClick={() => loadVehicleDetails(vehicle.placa)}
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
            count={filteredVehicles.length}
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

      {/* 📊 Dialog de detalles del vehículo */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Historial del Vehículo
            </Typography>
            <IconButton onClick={() => setDetailsOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedVehicle && (
            <Box>
              {/* Información del vehículo */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ mr: 2, width: 56, height: 56, bgcolor: 'primary.main' }}>
                          <DirectionsCar />
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {selectedVehicle.vehiculo.placa}
                          </Typography>
                          <Chip
                            label={selectedVehicle.estadisticas.mantenimientoRequerido ? 'Requiere Mantenimiento' : 'Operativo'}
                            color={selectedVehicle.estadisticas.mantenimientoRequerido ? 'warning' : 'success'}
                            size="small"
                          />
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
                            {selectedVehicle.vehiculo.totalInspecciones}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Eficiencia
                          </Typography>
                          <Typography variant="h6" color={
                            selectedVehicle.estadisticas.eficiencia >= 90 ? 'success.main' :
                            selectedVehicle.estadisticas.eficiencia >= 75 ? 'warning.main' : 'error.main'
                          }>
                            {selectedVehicle.estadisticas.eficiencia.toFixed(1)}%
                          </Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Conductores asignados */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Conductores Asignados
                  </Typography>
                  <List dense>
                    {selectedVehicle.conductoresAsignados.map((conductor, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Person />
                        </ListItemIcon>
                        <ListItemText
                          primary={conductor.nombre}
                          secondary={`${conductor.inspecciones} inspecciones - Cédula: ${conductor.cedula}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>

              {/* Problemas recurrentes */}
              {selectedVehicle.estadisticas.problemasRecurrentes.length > 0 && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Problemas Recurrentes
                    </Typography>
                    <List dense>
                      {selectedVehicle.estadisticas.problemasRecurrentes.map((problema, index) => (
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
                    {selectedVehicle.historial.slice(0, 5).map((inspeccion, index) => (
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
                            primary={`${formatDate(inspeccion.fecha)} - ${inspeccion.conductor_nombre}`}
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
                        {index < selectedVehicle.historial.slice(0, 5).length - 1 && <Divider />}
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

export default Vehicles;
