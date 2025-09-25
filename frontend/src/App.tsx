import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Search from './pages/Search/Search';
import Reports from './pages/Reports/Reports';
import Upload from './pages/Upload/Upload';
import Drivers from './pages/Drivers/Drivers';
import Vehicles from './pages/Vehicles/Vehicles';
import Fatigue from './pages/Fatigue/Fatigue';
import Alerts from './pages/Alerts/Alerts';

function App() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Layout>
        <Routes>
          {/* 🏠 Dashboard Principal */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* 🔍 Búsqueda y Filtros */}
          <Route path="/search" element={<Search />} />
          
          {/* 👨‍💼 Gestión de Conductores */}
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/drivers/:driverId" element={<Drivers />} />
          
          {/* 🚗 Gestión de Vehículos */}
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vehicles/:placa" element={<Vehicles />} />
          
          {/* 🚨 Análisis de Fatiga */}
          <Route path="/fatigue" element={<Fatigue />} />
          
          {/* 🔔 Alertas y Notificaciones */}
          <Route path="/alerts" element={<Alerts />} />
          
          {/* 📊 Reportes y Análisis */}
          <Route path="/reports" element={<Reports />} />
          
          {/* 📤 Carga de Archivos */}
          <Route path="/upload" element={<Upload />} />
          
          {/* 404 - Página no encontrada */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </Box>
  );
}

export default App;
