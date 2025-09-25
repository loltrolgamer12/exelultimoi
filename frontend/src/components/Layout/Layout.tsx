import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  DirectionsCar as VehicleIcon,
  Warning as FatigueIcon,
  Notifications as AlertsIcon,
  Assessment as ReportsIcon,
  CloudUpload as UploadIcon,
  Settings as SettingsIcon,
  AccountCircle,
  Brightness4,
  Brightness7,
  Refresh,
  Help,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 280;

interface LayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  path: string;
  badge?: number;
  color?: string;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [alertsCount, setAlertsCount] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 📋 Elementos de navegación
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
    },
    {
      id: 'search',
      label: 'Búsqueda',
      icon: <SearchIcon />,
      path: '/search',
    },
    {
      id: 'drivers',
      label: 'Conductores',
      icon: <PeopleIcon />,
      path: '/drivers',
    },
    {
      id: 'vehicles',
      label: 'Vehículos',
      icon: <VehicleIcon />,
      path: '/vehicles',
    },
    {
      id: 'fatigue',
      label: 'Análisis Fatiga',
      icon: <FatigueIcon />,
      path: '/fatigue',
      color: '#ed6c02',
    },
    {
      id: 'alerts',
      label: 'Alertas',
      icon: <AlertsIcon />,
      path: '/alerts',
      badge: alertsCount,
      color: alertsCount > 0 ? '#d32f2f' : undefined,
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: <ReportsIcon />,
      path: '/reports',
    },
    {
      id: 'upload',
      label: 'Cargar Datos',
      icon: <UploadIcon />,
      path: '/upload',
    },
  ];

  // 🔄 Cargar alertas activas
  useEffect(() => {
    const loadAlertsCount = async () => {
      try {
        // TODO: Implementar llamada real a la API
        // const alerts = await searchService.getActiveAlerts({ tipo: 'CRITICA' });
        // setAlertsCount(alerts.length);
        setAlertsCount(3); // Valor temporal para demo
      } catch (error) {
        console.error('Error cargando alertas:', error);
      }
    };

    loadAlertsCount();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadAlertsCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // TODO: Implementar cambio de tema
  };

  // 📱 Contenido del drawer
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 🏢 Header del sistema */}
      <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          Sistema HQ-FO-40
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          V2.0 - Inspecciones Vehiculares
        </Typography>
      </Box>

      <Divider />

      {/* 🧭 Navegación principal */}
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5, px: 1 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ color: item.color || 'inherit', minWidth: 40 }}>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* ⚙️ Configuración */}
      <List>
        <ListItem disablePadding sx={{ px: 1 }}>
          <ListItemButton
            onClick={() => handleNavigation('/settings')}
            sx={{ borderRadius: 2 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Configuración"
              primaryTypographyProps={{ fontSize: '0.9rem' }}
            />
          </ListItemButton>
        </ListItem>
      </List>

      {/* 📊 Estado del sistema */}
      <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, m: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Estado del Sistema
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'success.main',
              mr: 1,
            }}
          />
          <Typography variant="caption" color="success.main">
            Operativo
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* 📱 AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="abrir menú"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navigationItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
          </Typography>

          {/* 🔄 Botón de actualizar */}
          <Tooltip title="Actualizar datos">
            <IconButton color="inherit" onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>

          {/* 🌙 Toggle tema */}
          <Tooltip title="Cambiar tema">
            <IconButton color="inherit" onClick={toggleDarkMode}>
              {isDarkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>

          {/* 🔔 Alertas */}
          <Tooltip title="Alertas activas">
            <IconButton 
              color="inherit" 
              onClick={() => handleNavigation('/alerts')}
            >
              <Badge badgeContent={alertsCount} color="error">
                <AlertsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* 👤 Menú de usuario */}
          <Tooltip title="Cuenta de usuario">
            <IconButton
              size="large"
              edge="end"
              aria-label="cuenta del usuario"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleMenuClose}>
              <AccountCircle sx={{ mr: 1 }} />
              Mi Perfil
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <SettingsIcon sx={{ mr: 1 }} />
              Configuración
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleMenuClose}>
              <Help sx={{ mr: 1 }} />
              Ayuda
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* 📱 Drawer de navegación */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Mejor rendimiento en móviles
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* 📄 Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // Altura del AppBar
          minHeight: 'calc(100vh - 64px)',
          bgcolor: 'background.default',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
