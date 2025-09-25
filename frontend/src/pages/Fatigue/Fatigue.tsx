import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  LocalHospital,
  Bedtime,
  Psychology,
  FitnessCenter,
  TrendingUp,
  TrendingDown,
  Warning,
  Error,
  CheckCircle,
  Download,
  Refresh,
  Assessment,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { searchService } from '../../services/searchService';
import { dashboardService } from '../../services/dashboardService';
import { formatNumber, formatDate } from '../../services/api';

interface FatigueAnalysis {
  totalInspecciones: number;
  medicamentos: number;
  suenoInsuficiente: number;
  sintomasFatiga: number;
  noAptos: number;
  porcentajes: {
    medicamentos: number;
    problemasGenerales: number;
  };
}

interface FatigueTrend {
  fecha: string;
  medicamentos: number;
  suenoInsuficiente: number;
  sintomasFatiga: number;
  noAptos: number;
  total: number;
}

const Fatigue: React.FC = () => {
  const [fatigueData, setFatigueData] = useState<FatigueAnalysis | null>(null);
  const [trends, setTrends] = useState<FatigueTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7days' | '30days' | '90days'>('30days');

  // 🔄 Cargar datos de fatiga
  useEffect(() => {
    loadFatigueData();
  }, [period]);

  const loadFatigueData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summary, trendsData] = await Promise.all([
        searchService.getSummary('fatiga', { timeframe: period }),
        searchService.getTrends({ periodo: period, metrics: 'fatigue' })
      ]);

      setFatigueData(summary);
      
      // Procesar datos de tendencias para fatiga
      const processedTrends = trendsData.tendencias.map(item => ({
        fecha: item.fecha,
        medicamentos: item.medicamentos,
        suenoInsuficiente: item.suenoInsuficiente,
        sintomasFatiga: item.sintomasFatiga,
        noAptos: item.noAptos,
        total: item.medicamentos + item.suenoInsuficiente + item.sintomasFatiga + item.noAptos,
      }));
      
      setTrends(processedTrends);
    } catch (err) {
      console.error('Error cargando datos de fatiga:', err);
      setError((err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') ? (err as any).message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // 📊 Datos para gráfico de pastel
  const pieData = fatigueData ? [
    { name: 'Medicamentos', value: fatigueData.medicamentos, color: '#d32f2f' },
    { name: 'Sueño Insuficiente', value: fatigueData.suenoInsuficiente, color: '#ed6c02' },
    { name: 'Síntomas Fatiga', value: fatigueData.sintomasFatiga, color: '#f57c00' },
    { name: 'No Aptos', value: fatigueData.noAptos, color: '#c62828' },
    { 
      name: 'Sin Problemas', 
      value: fatigueData.totalInspecciones - (fatigueData.medicamentos + fatigueData.suenoInsuficiente + fatigueData.sintomasFatiga + fatigueData.noAptos), 
      color: '#2e7d32' 
    },
  ].filter(item => item.value > 0) : [];

  // 📈 Datos para gráfico de barras comparativo
  const barData = fatigueData ? [
    {
      categoria: 'Medicamentos',
      casos: fatigueData.medicamentos,
      porcentaje: fatigueData.totalInspecciones > 0 ? (fatigueData.medicamentos / fatigueData.totalInspecciones * 100) : 0,
    },
    {
      categoria: 'Sueño Insuficiente',
      casos: fatigueData.suenoInsuficiente,
      porcentaje: fatigueData.totalInspecciones > 0 ? (fatigueData.suenoInsuficiente / fatigueData.totalInspecciones * 100) : 0,
    },
    {
      categoria: 'Síntomas Fatiga',
      casos: fatigueData.sintomasFatiga,
      porcentaje: fatigueData.totalInspecciones > 0 ? (fatigueData.sintomasFatiga / fatigueData.totalInspecciones * 100) : 0,
    },
    {
      categoria: 'No Aptos',
      casos: fatigueData.noAptos,
      porcentaje: fatigueData.totalInspecciones > 0 ? (fatigueData.noAptos / fatigueData.totalInspecciones * 100) : 0,
    },
  ] : [];

  // 🎨 Obtener color de severidad
  const getSeverityColor = (percentage: number) => {
    if (percentage >= 20) return 'error';
    if (percentage >= 10) return 'warning';
    if (percentage >= 5) return 'info';
    return 'success';
  };

  // 📤 Descargar reporte de fatiga
  const handleDownloadReport = async () => {
    try {
      setLoading(true);
      const pdfBlob = await dashboardService.downloadFatigueAnalysis({
        periodo: period,
        includeDriverDetails: true,
        includeRecommendations: true,
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Analisis_Fatiga_${period}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando reporte:', error);
      setError('Error al generar el reporte PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 🚨 Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Análisis de Fatiga del Conductor
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Período</InputLabel>
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
            >
              <MenuItem value="7days">7 días</MenuItem>
              <MenuItem value="30days">30 días</MenuItem>
              <MenuItem value="90days">90 días</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadFatigueData}
            disabled={loading}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownloadReport}
            disabled={loading}
          >
            Descargar PDF
          </Button>
        </Box>
      </Box>

      {/* ⚠️ Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 📊 Métricas principales */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocalHospital sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="error.main">
                    {fatigueData?.medicamentos || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Consumo Medicamentos
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={fatigueData?.totalInspecciones ? (fatigueData.medicamentos / fatigueData.totalInspecciones * 100) : 0}
                color="error"
                sx={{ height: 6, borderRadius: 3 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {fatigueData?.totalInspecciones ? 
                  `${((fatigueData.medicamentos / fatigueData.totalInspecciones) * 100).toFixed(1)}% del total` : 
                  '0% del total'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Bedtime sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {fatigueData?.suenoInsuficiente || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sueño Insuficiente
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={fatigueData?.totalInspecciones ? (fatigueData.suenoInsuficiente / fatigueData.totalInspecciones * 100) : 0}
                color="warning"
                sx={{ height: 6, borderRadius: 3 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {fatigueData?.totalInspecciones ? 
                  `${((fatigueData.suenoInsuficiente / fatigueData.totalInspecciones) * 100).toFixed(1)}% del total` : 
                  '0% del total'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Psychology sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {fatigueData?.sintomasFatiga || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Síntomas de Fatiga
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={fatigueData?.totalInspecciones ? (fatigueData.sintomasFatiga / fatigueData.totalInspecciones * 100) : 0}
                color="warning"
                sx={{ height: 6, borderRadius: 3 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {fatigueData?.totalInspecciones ? 
                  `${((fatigueData.sintomasFatiga / fatigueData.totalInspecciones) * 100).toFixed(1)}% del total` : 
                  '0% del total'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FitnessCenter sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="error.main">
                    {fatigueData?.noAptos || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No Aptos para Conducir
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={fatigueData?.totalInspecciones ? (fatigueData.noAptos / fatigueData.totalInspecciones * 100) : 0}
                color="error"
                sx={{ height: 6, borderRadius: 3 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {fatigueData?.totalInspecciones ? 
                  `${((fatigueData.noAptos / fatigueData.totalInspecciones) * 100).toFixed(1)}% del total` : 
                  '0% del total'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 📈 Gráficos */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Distribución de problemas de fatiga */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '400px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distribución de Problemas de Fatiga
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Comparativo por categoría */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '400px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Comparativo por Categoría
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="casos" fill="#ed6c02" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 📊 Tendencias temporales */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tendencias de Fatiga en el Tiempo
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="medicamentos" stroke="#d32f2f" name="Medicamentos" />
                    <Line type="monotone" dataKey="suenoInsuficiente" stroke="#ed6c02" name="Sueño Insuficiente" />
                    <Line type="monotone" dataKey="sintomasFatiga" stroke="#f57c00" name="Síntomas Fatiga" />
                    <Line type="monotone" dataKey="noAptos" stroke="#c62828" name="No Aptos" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 📋 Análisis detallado */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Análisis de Severidad
              </Typography>
              <List>
                {barData.map((item, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemIcon>
                        {item.porcentaje >= 20 ? (
                          <Error color="error" />
                        ) : item.porcentaje >= 10 ? (
                          <Warning color="warning" />
                        ) : (
                          <CheckCircle color="success" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.categoria}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {item.casos} casos ({item.porcentaje.toFixed(1)}%)
                            </Typography>
                            <Chip
                              size="small"
                              label={
                                item.porcentaje >= 20 ? 'Crítico' :
                                item.porcentaje >= 10 ? 'Alto' :
                                item.porcentaje >= 5 ? 'Moderado' : 'Bajo'
                              }
                              color={getSeverityColor(item.porcentaje)}
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < barData.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recomendaciones
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Assessment color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Implementar programa de educación"
                    secondary="Capacitar a conductores sobre riesgos de fatiga y medicamentos"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <Bedtime color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Monitoreo de horas de descanso"
                    secondary="Establecer controles más estrictos sobre las horas de sueño"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <LocalHospital color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Protocolo médico"
                    secondary="Crear protocolo para conductores que consumen medicamentos"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <Psychology color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Evaluación psicológica"
                    secondary="Implementar evaluaciones periódicas de estado mental"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Fatigue;
