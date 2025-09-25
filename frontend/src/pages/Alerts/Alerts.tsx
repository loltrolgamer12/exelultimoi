import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
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
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Error,
  Warning,
  CheckCircle,
  Visibility,
  Refresh,
  FilterList,
  NotificationsActive,
  Person,
  DirectionsCar,
  Schedule,
  PriorityHigh,
} from '@mui/icons-material';
import { searchService, ActiveAlert } from '../../services/searchService';
import { formatDate, formatDateTime } from '../../services/api';

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('TODAS');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVA');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // 🔄 Cargar alertas
  useEffect(() => {
    loadAlerts();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [typeFilter, statusFilter]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {};
      if (typeFilter !== 'TODAS') filters.tipo = typeFilter;
      if (statusFilter !== 'TODAS') filters.estado = statusFilter;

      const alertsData = await searchService.getActiveAlerts(filters);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Error cargando alertas:', err);
      setError((err as Error)?.message ?? 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Filtrar alertas
  const filteredAlerts = alerts.filter(alert => {
    const matchesType = typeFilter === 'TODAS' || alert.tipo === typeFilter;
    const matchesStatus = statusFilter === 'TODAS' || alert.estado === statusFilter;
    return matchesType && matchesStatus;
  });

  // 📄 Paginación
  const paginatedAlerts = filteredAlerts.slice(
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

  // 🎨 Obtener color del tipo de alerta
  const getAlertColor = (tipo: string) => {
    switch (tipo) {
      case 'CRITICA':
        return 'error';
      case 'ADVERTENCIA':
        return 'warning';
      default:
        return 'info';
    }
  };

  // 🎨 Obtener color del estado
  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'ACTIVA':
        return 'error';
      case 'EN_REVISION':
        return 'warning';
      case 'RESUELTA':
        return 'success';
      default:
        return 'default';
    }
  };

  // 🎨 Obtener color de prioridad
  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'ALTA':
        return 'error';
      case 'MEDIA':
        return 'warning';
      case 'BAJA':
        return 'info';
      default:
        return 'default';
    }
  };

  // 📊 Estadísticas de alertas
  const alertStats = {
    total: alerts.length,
    criticas: alerts.filter(a => a.tipo === 'CRITICA').length,
    advertencias: alerts.filter(a => a.tipo === 'ADVERTENCIA').length,
    activas: alerts.filter(a => a.estado === 'ACTIVA').length,
    enRevision: alerts.filter(a => a.estado === 'EN_REVISION').length,
    resueltas: alerts.filter(a => a.estado === 'RESUELTA').length,
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 🔔 Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Centro de Alertas
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadAlerts}
            disabled={loading}
          >
            Actualizar
          </Button>
        </Box>
      </Box>

      {/* 📊 Estadísticas rápidas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <NotificationsActive />
                </Avatar>
                <Box>
                  <Typography variant="h6">{alertStats.total}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Alertas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                  <Error />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="error.main">
                    {alertStats.criticas}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Críticas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Warning />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="warning.main">
                    {alertStats.advertencias}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Advertencias
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                  <PriorityHigh />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="error.main">
                    {alertStats.activas}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Activas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Schedule />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="warning.main">
                    {alertStats.enRevision}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    En Revisión
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="success.main">
                    {alertStats.resueltas}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Resueltas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 🔍 Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Alerta</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  startAdornment={<FilterList sx={{ mr: 1, color: 'text.secondary' }} />}
                >
                  <MenuItem value="TODAS">Todas</MenuItem>
                  <MenuItem value="CRITICA">Críticas</MenuItem>
                  <MenuItem value="ADVERTENCIA">Advertencias</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="TODAS">Todos</MenuItem>
                  <MenuItem value="ACTIVA">Activas</MenuItem>
                  <MenuItem value="EN_REVISION">En Revisión</MenuItem>
                  <MenuItem value="RESUELTA">Resueltas</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setTypeFilter('TODAS');
                  setStatusFilter('ACTIVA');
                }}
              >
                Limpiar Filtros
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

      {/* 📋 Lista de alertas */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Alertas Activas
              <Badge badgeContent={filteredAlerts.length} color="primary" sx={{ ml: 2 }} />
            </Typography>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Conductor</TableCell>
                  <TableCell>Vehículo</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Prioridad</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedAlerts.map((alert) => (
                  <TableRow key={alert.id} hover>
                    <TableCell>
                      <Chip
                        icon={alert.tipo === 'CRITICA' ? <Error /> : <Warning />}
                        label={alert.tipo}
                        color={getAlertColor(alert.tipo)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDateTime(alert.fecha)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Person sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2">
                          {alert.conductor}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DirectionsCar sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2">
                          {alert.vehiculo}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }}>
                        {alert.descripcion}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={alert.prioridad}
                        color={getPriorityColor(alert.prioridad)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={alert.estado.replace('_', ' ')}
                        color={getStatusColor(alert.estado)}
                        size="small"
                      />
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
            count={filteredAlerts.length}
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

      {/* 📊 Estado sin alertas */}
      {filteredAlerts.length === 0 && !loading && (
        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="success.main" gutterBottom>
              No hay alertas activas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Todos los sistemas están funcionando correctamente
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Alerts;
