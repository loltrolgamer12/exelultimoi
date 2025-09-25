import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Download,
  PictureAsPdf,
  TableChart,
  Assessment,
  DateRange,
  Business,
  LocationOn,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { dashboardService } from '../../services/dashboardService';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 📊 Estados para reporte diario
  const [dailyDate, setDailyDate] = useState<Date | null>(new Date());
  const [dailyIncludeCharts, setDailyIncludeCharts] = useState(true);
  const [dailyContrato, setDailyContrato] = useState('');
  const [dailyCampo, setDailyCampo] = useState('');

  // 📈 Estados para reporte ejecutivo
  const [executivePeriod, setExecutivePeriod] = useState('1month');
  const [executiveIncludeComparisons, setExecutiveIncludeComparisons] = useState(true);
  const [executiveIncludeProjections, setExecutiveIncludeProjections] = useState(true);

  // 🚨 Estados para análisis de fatiga
  const [fatiguePeriod, setFatiguePeriod] = useState('30days');
  const [fatigueIncludeDrivers, setFatigueIncludeDrivers] = useState(true);
  const [fatigueIncludeRecommendations, setFatigueIncludeRecommendations] = useState(true);

  // 🎯 Estados para reporte personalizado
  const [customTitle, setCustomTitle] = useState('');
  const [customSections, setCustomSections] = useState<string[]>(['stats', 'alerts']);
  const [customIncludeCharts, setCustomIncludeCharts] = useState(true);
  const [customIncludeData, setCustomIncludeData] = useState(true);

  // 📄 Generar reporte diario
  const handleDailyReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const pdfBlob = await dashboardService.downloadDailyReport({
        fecha: dailyDate?.toISOString().split('T')[0],
        includeCharts: dailyIncludeCharts,
        contrato: dailyContrato || undefined,
        campo: dailyCampo || undefined,
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Diario_${dailyDate?.toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccess('Reporte diario generado exitosamente');
    } catch (err) {
      console.error('Error generando reporte diario:', err);
      setError('Error al generar el reporte diario');
    } finally {
      setLoading(false);
    }
  };

  // 📊 Generar reporte ejecutivo
  const handleExecutiveReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const pdfBlob = await dashboardService.downloadExecutiveSummary({
        periodo: executivePeriod,
        includeComparisons: executiveIncludeComparisons,
        includeProjections: executiveIncludeProjections,
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Ejecutivo_${executivePeriod}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccess('Reporte ejecutivo generado exitosamente');
    } catch (err) {
      console.error('Error generando reporte ejecutivo:', err);
      setError('Error al generar el reporte ejecutivo');
    } finally {
      setLoading(false);
    }
  };

  // 🚨 Generar análisis de fatiga
  const handleFatigueReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const pdfBlob = await dashboardService.downloadFatigueAnalysis({
        periodo: fatiguePeriod,
        includeDriverDetails: fatigueIncludeDrivers,
        includeRecommendations: fatigueIncludeRecommendations,
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Analisis_Fatiga_${fatiguePeriod}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccess('Análisis de fatiga generado exitosamente');
    } catch (err) {
      console.error('Error generando análisis de fatiga:', err);
      setError('Error al generar el análisis de fatiga');
    } finally {
      setLoading(false);
    }
  };

  // 🎯 Generar reporte personalizado
  const handleCustomReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const pdfBlob = await dashboardService.generateCustomReport({
        titulo: customTitle || 'Reporte Personalizado',
        secciones: customSections,
        includeCharts: customIncludeCharts,
        includeData: customIncludeData,
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${customTitle || 'Reporte_Personalizado'}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccess('Reporte personalizado generado exitosamente');
    } catch (err) {
      console.error('Error generando reporte personalizado:', err);
      setError('Error al generar el reporte personalizado');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionToggle = (section: string) => {
    setCustomSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ flexGrow: 1 }}>
        {/* 📊 Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Centro de Reportes
          </Typography>
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
          {/* 📄 Reporte Diario */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <DateRange sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Reporte Diario
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Genera un reporte detallado de las inspecciones de un día específico
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <DatePicker
                    label="Fecha del reporte"
                    value={dailyDate}
                    onChange={(date) => setDailyDate(date)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Contrato (opcional)"
                    value={dailyContrato}
                    onChange={(e) => setDailyContrato(e.target.value)}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Campo (opcional)"
                    value={dailyCampo}
                    onChange={(e) => setDailyCampo(e.target.value)}
                  />
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={dailyIncludeCharts}
                      onChange={(e) => setDailyIncludeCharts(e.target.checked)}
                    />
                  }
                  label="Incluir gráficos"
                  sx={{ mb: 2 }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <PictureAsPdf />}
                  onClick={handleDailyReport}
                  disabled={loading || !dailyDate}
                >
                  Generar Reporte Diario
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* 📈 Reporte Ejecutivo */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Assessment sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Reporte Ejecutivo
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Resumen ejecutivo con métricas clave y análisis de tendencias
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Período</InputLabel>
                    <Select
                      value={executivePeriod}
                      onChange={(e) => setExecutivePeriod(e.target.value)}
                    >
                      <MenuItem value="1week">1 Semana</MenuItem>
                      <MenuItem value="1month">1 Mes</MenuItem>
                      <MenuItem value="3months">3 Meses</MenuItem>
                      <MenuItem value="6months">6 Meses</MenuItem>
                      <MenuItem value="1year">1 Año</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={executiveIncludeComparisons}
                      onChange={(e) => setExecutiveIncludeComparisons(e.target.checked)}
                    />
                  }
                  label="Incluir comparaciones"
                  sx={{ mb: 1 }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={executiveIncludeProjections}
                      onChange={(e) => setExecutiveIncludeProjections(e.target.checked)}
                    />
                  }
                  label="Incluir proyecciones"
                  sx={{ mb: 2 }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <PictureAsPdf />}
                  onClick={handleExecutiveReport}
                  disabled={loading}
                >
                  Generar Reporte Ejecutivo
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* 🚨 Análisis de Fatiga */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Assessment sx={{ mr: 2, color: 'warning.main' }} />
                  <Typography variant="h6">
                    Análisis de Fatiga
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Análisis detallado de problemas de fatiga y recomendaciones
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Período</InputLabel>
                    <Select
                      value={fatiguePeriod}
                      onChange={(e) => setFatiguePeriod(e.target.value)}
                    >
                      <MenuItem value="7days">7 días</MenuItem>
                      <MenuItem value="30days">30 días</MenuItem>
                      <MenuItem value="90days">90 días</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={fatigueIncludeDrivers}
                      onChange={(e) => setFatigueIncludeDrivers(e.target.checked)}
                    />
                  }
                  label="Incluir detalles de conductores"
                  sx={{ mb: 1 }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={fatigueIncludeRecommendations}
                      onChange={(e) => setFatigueIncludeRecommendations(e.target.checked)}
                    />
                  }
                  label="Incluir recomendaciones"
                  sx={{ mb: 2 }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <PictureAsPdf />}
                  onClick={handleFatigueReport}
                  disabled={loading}
                >
                  Generar Análisis de Fatiga
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* 🎯 Reporte Personalizado */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TableChart sx={{ mr: 2, color: 'secondary.main' }} />
                  <Typography variant="h6">
                    Reporte Personalizado
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Crea un reporte personalizado seleccionando las secciones que necesitas
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Título del reporte"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Reporte Personalizado"
                  />
                </Box>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Secciones a incluir:
                </Typography>
                <List dense sx={{ mb: 2 }}>
                  {[
                    { id: 'stats', label: 'Estadísticas Generales', icon: <Assessment /> },
                    { id: 'alerts', label: 'Alertas y Advertencias', icon: <Assessment /> },
                    { id: 'trends', label: 'Análisis de Tendencias', icon: <Assessment /> },
                    { id: 'fatigue', label: 'Análisis de Fatiga', icon: <Assessment /> },
                    { id: 'drivers', label: 'Reporte de Conductores', icon: <Assessment /> },
                    { id: 'vehicles', label: 'Estado de Vehículos', icon: <Assessment /> },
                  ].map((section) => (
                    <ListItem key={section.id} dense>
                      <ListItemIcon>
                        {section.icon}
                      </ListItemIcon>
                      <ListItemText primary={section.label} />
                      <Checkbox
                        checked={customSections.includes(section.id)}
                        onChange={() => handleSectionToggle(section.id)}
                      />
                    </ListItem>
                  ))}
                </List>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={customIncludeCharts}
                      onChange={(e) => setCustomIncludeCharts(e.target.checked)}
                    />
                  }
                  label="Incluir gráficos"
                  sx={{ mb: 1 }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={customIncludeData}
                      onChange={(e) => setCustomIncludeData(e.target.checked)}
                    />
                  }
                  label="Incluir tablas de datos"
                  sx={{ mb: 2 }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <PictureAsPdf />}
                  onClick={handleCustomReport}
                  disabled={loading || customSections.length === 0}
                >
                  Generar Reporte Personalizado
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 📋 Información adicional */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Información sobre los Reportes
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <PictureAsPdf color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Formato PDF"
                  secondary="Todos los reportes se generan en formato PDF profesional"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <Download color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Descarga Automática"
                  secondary="Los reportes se descargan automáticamente al generarse"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <Assessment color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Datos en Tiempo Real"
                  secondary="Los reportes incluyen los datos más actualizados del sistema"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default Reports;
