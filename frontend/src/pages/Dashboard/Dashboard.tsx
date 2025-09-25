import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error,
  People,
  DirectionsCar,
  Assessment,
  Refresh,
  LocalHospital,
  Bedtime,
  Psychology,
  FitnessCenter,
} from '@mui/icons-material';
import { dashboardService, WidgetData, KPIData } from '../../services/dashboardService';
import { formatNumber, formatDate } from '../../services/api';

// 📊 Componente de Widget de Estadística
interface StatWidgetProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactElement;
  color: 'primary' | 'secondary' | 'error' | 'warning' | 'success';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

const StatWidget: React.FC<StatWidgetProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  loading = false,
}) => {
  return (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: `${color}.light`,
              color: `${color}.contrastText`,
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              {loading ? <CircularProgress size={20} /> : formatNumber(Number(value))}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
        
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
        
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {trend.isPositive ? (
              <TrendingUp sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
            ) : (
              <TrendingDown sx={{ color: 'error.main', fontSize: 16, mr: 0.5 }} />
            )}
            <Typography variant="caption" color={trend.isPositive ? 'success.main' : 'error.main'}>
              {trend.value}%
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// 🚨 Componente de Alertas Recientes
interface RecentAlertsProps {
  alerts: WidgetData['ultimasAlertas'];
  loading?: boolean;
}

const RecentAlerts: React.FC<RecentAlertsProps> = ({ alerts, loading = false }) => {
  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Alertas Recientes
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Alertas Recientes
        </Typography>
        {alerts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No hay alertas críticas
            </Typography>
          </Box>
        ) : (
          <List dense>
            {alerts.slice(0, 5).map((alert, index) => (
              <ListItem key={alert.id} divider={index < alerts.length - 1}>
                <ListItemIcon>
                  <Error sx={{ color: 'error.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary={`${alert.conductor_nombre} - ${alert.placa_vehiculo}`}
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        {alert.observaciones}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Hace {alert.timeAgo}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

// 📊 Componente de Problemas Comunes
interface CommonProblemsProps {
  problems: WidgetData['problemasComunes'];
  loading?: boolean;
}

const CommonProblems: React.FC<CommonProblemsProps> = ({ problems, loading = false }) => {
  const getIcon = (problema: string) => {
    if (problema.includes('Medicamentos')) return <LocalHospital />;
    if (problema.includes('Sueño')) return <Bedtime />;
    if (problema.includes('Fatiga')) return <Psychology />;
    if (problema.includes('apto')) return <FitnessCenter />;
    return <Warning />;
  };

  const getColor = (percentage: number) => {
    if (percentage >= 20) return 'error.main';
    if (percentage >= 10) return 'warning.main';
    return 'success.main';
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Problemas Más Comunes
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Problemas Más Comunes (7 días)
        </Typography>
        <List dense>
          {problems.map((problem, index) => (
            <ListItem key={index} sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getIcon(problem.problema)}
              </ListItemIcon>
              <ListItemText
                primary={problem.problema}
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption">
                        {problem.count} casos
                      </Typography>
                      <Typography variant="caption" sx={{ color: getColor(problem.percentage) }}>
                        {problem.percentage}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={problem.percentage}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getColor(problem.percentage),
                        },
                      }}
                    />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

// 🎯 Componente de KPIs
interface KPICardProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  isPercentage?: boolean;
  loading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  current,
  target,
  unit = '',
  isPercentage = false,
  loading = false,
}) => {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const isOnTarget = current >= target;
  const color = isOnTarget ? 'success' : percentage >= 80 ? 'warning' : 'error';

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          <>
            <Typography variant="h4" component="div" sx={{ mb: 1 }}>
              {formatNumber(current)}{isPercentage ? '%' : unit}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Meta: {formatNumber(target)}{isPercentage ? '%' : unit}
              </Typography>
              <Chip
                size="small"
                label={isOnTarget ? 'Cumplido' : 'Pendiente'}
                color={color}
                sx={{ ml: 1 }}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(percentage, 100)}
              color={color}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

// 📊 Componente Principal del Dashboard
const Dashboard: React.FC = () => {
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 🔄 Cargar datos del dashboard
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [widgets, kpis] = await Promise.all([
        dashboardService.getWidgets(),
        dashboardService.getKPIs({ periodo: '30days' }),
      ]);

      setWidgetData(widgets);
      setKpiData(kpis);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as Error).message);
      } else {
        setError('Error desconocido');
      }
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Cargar datos al montar el componente
  useEffect(() => {
    loadDashboardData();

    // Auto-refresh cada 5 minutos
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 🔄 Manejar refresh manual
  const handleRefresh = () => {
    loadDashboardData();
  };


  // Verificación de estructura de datos
  const estructuraValida = kpiData && kpiData.operacionales && typeof kpiData.operacionales.eficiencia === 'number';
  if (error || !estructuraValida) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error ? `Error cargando el dashboard: ${error}` : 'Los datos recibidos del servidor no tienen la estructura esperada. Por favor, contacte al administrador.'}
        </Alert>
        <Box sx={{ textAlign: 'center' }}>
          <IconButton onClick={handleRefresh} color="primary">
            <Refresh />
          </IconButton>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 📊 Header con información de actualización */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Dashboard Principal
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Última actualización: {formatDate(lastUpdate.toISOString())} {lastUpdate.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Actualizar datos">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 📈 Widgets principales */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatWidget
            title="Inspecciones Hoy"
            value={widgetData?.resumenHoy.inspecciones || 0}
            subtitle="Total del día actual"
            icon={<Assessment />}
            color="primary"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatWidget
            title="Alertas Críticas"
            value={widgetData?.resumenHoy.alertasRojas || 0}
            subtitle="Requieren atención inmediata"
            icon={<Error />}
            color="error"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatWidget
            title="Conductores Activos"
            value={widgetData?.resumenHoy.conductores || 0}
            subtitle="Conductores únicos hoy"
            icon={<People />}
            color="success"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatWidget
            title="Eficiencia"
            value={`${widgetData?.resumenHoy.eficiencia || 0}%`}
            subtitle="Inspecciones sin problemas"
            icon={<CheckCircle />}
            color={widgetData?.resumenHoy.eficiencia && widgetData.resumenHoy.eficiencia >= 95 ? 'success' : 'warning'}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* 📊 KPIs principales */}
      {kpiData && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Indicadores Clave de Rendimiento (KPIs)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Eficiencia Operacional"
                current={kpiData.operacionales.eficiencia}
                target={kpiData.metas.eficienciaObjetivo}
                isPercentage
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Tasa de Alertas Rojas"
                current={kpiData.seguridad.tasaAlertasRojas}
                target={kpiData.metas.tasaAlertasMaxima}
                isPercentage
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Puntaje Promedio"
                current={kpiData.operacionales.puntajePromedio}
                target={kpiData.metas.puntajeMinimoObjetivo}
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Índice de Fatiga"
                current={kpiData.fatiga.indiceFatiga}
                target={kpiData.metas.indiceFatigaMaximo}
                isPercentage
                loading={loading}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* 📋 Sección de análisis detallado */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <RecentAlerts
            alerts={widgetData?.ultimasAlertas || []}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <CommonProblems
            problems={widgetData?.problemasComunes || []}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Estado General del Sistema
              </Typography>
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: widgetData?.indicadores.statusGeneral === 'green' ? 'success.main' :
                             widgetData?.indicadores.statusGeneral === 'yellow' ? 'warning.main' : 'error.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  {widgetData?.indicadores.statusGeneral === 'green' ? (
                    <CheckCircle sx={{ fontSize: 40, color: 'white' }} />
                  ) : (
                    <Warning sx={{ fontSize: 40, color: 'white' }} />
                  )}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {widgetData?.indicadores.statusGeneral === 'green' ? 'Operativo' :
                   widgetData?.indicadores.statusGeneral === 'yellow' ? 'Advertencia' : 'Crítico'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {widgetData?.indicadores.alertasCriticas || 0} alertas críticas activas
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
