// src/components/MapView.jsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { MapPin, Users, ClipboardList, Star, Phone, Mail, Filter, X, Calendar, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InspectionListDialog from './InspectionListDialog';

// Dynamically import MapContainer to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Custom icons for different marker types
const createCustomIcon = (type, status = null, count = null) => {
  if (typeof window === 'undefined') return null;
  
  const L = require('leaflet');
  
  const getIconConfig = () => {
    if (type === 'inspector') {
      return {
        html: `
          <div style="
            background-color: #3b82f6;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
          ">👤</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
        className: 'inspector-marker'
      };
    } else if (type === 'inspection-group') {
      return {
        html: `
          <div style="
            background-color: #8b5cf6;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 3px 6px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
          ">${count}</div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -19],
        className: 'inspection-group-marker'
      };
    } else {
      // Single inspection marker with different colors based on status
      const colors = {
        pending: '#fbbf24',
        in_progress: '#3b82f6',
        completed: '#10b981',
        canceled: '#ef4444'
      };
      
      const color = colors[status] || '#6b7280';
      const emojis = {
        pending: '⏳',
        in_progress: '🔄',
        completed: '✅',
        canceled: '❌'
      };
      const emoji = emojis[status] || '📋';
      
      return {
        html: `
          <div style="
            background-color: ${color};
            width: 24px;
            height: 24px;
            border-radius: 4px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
          ">${emoji}</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
        className: 'inspection-marker'
      };
    }
  };
  
  const config = getIconConfig();
  return L.divIcon(config);
};

const getStatusText = (status) => {
  const statusMap = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    canceled: 'Cancelada'
  };
  return statusMap[status] || status;
};

const getStatusColor = (status) => {
  const colorMap = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    canceled: 'bg-red-100 text-red-800'
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
};

export default function MapView() {
  const [mapType, setMapType] = useState('inspectors');
  const [inspectors, setInspectors] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocationInspections, setSelectedLocationInspections] = useState([]);
  const [selectedLocationCity, setSelectedLocationCity] = useState('');
  const [selectedLocationState, setSelectedLocationState] = useState('');
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    project: 'all',
    city: 'all',
    state: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: ''
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Center map on Brazil (approximate center)
  const defaultCenter = [-14.2350, -51.9253];
  const defaultZoom = 4;

  useEffect(() => {
    if (user) {
      fetchMapData();
    }
  }, [user]);

  useEffect(() => {
    // Set map loaded state
    if (typeof window !== 'undefined') {
      setMapLoaded(true);
    }
  }, []);

  const fetchMapData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchInspectors(), fetchInspections(), fetchProjects()]);
    } catch (error) {
      console.error('Error fetching map data:', error);
      toast({
        title: 'Erro ao carregar dados do mapa',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInspectors = async () => {
    try {
      const inspectorsQuery = query(
        collection(db, 'inspectors'),
        where('deleted_at', '==', null)
      );
      
      const snapshot = await getDocs(inspectorsQuery);
      const inspectorsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(inspector => 
        inspector.city && inspector.state // Only include inspectors with location data
      );
      
      setInspectors(inspectorsList);
    } catch (error) {
      console.error('Error fetching inspectors:', error);
    }
  };

  const fetchInspections = async () => {
    try {
      // First get projects for this manager
      const projectsQuery = query(
        collection(db, 'projects'),
        where('manager_id', '==', user.uid),
        where('deleted_at', '==', null)
      );
      
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectIds = projectsSnapshot.docs.map(doc => doc.id);
      
      if (projectIds.length === 0) {
        setInspections([]);
        return;
      }
      
      // Get inspections for these projects in batches
      const inspectionsList = [];
      const batchSize = 10;
      
      for (let i = 0; i < projectIds.length; i += batchSize) {
        const batch = projectIds.slice(i, i + batchSize);
        const inspectionsQuery = query(
          collection(db, 'inspections'),
          where('project_id', 'in', batch),
          where('deleted_at', '==', null)
        );
        
        const batchSnapshot = await getDocs(inspectionsQuery);
        const batchInspections = batchSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            scheduled_date: data.scheduled_date?.toDate?.()?.toISOString() || data.scheduled_date
          };
        }).filter(inspection => 
          inspection.address || inspection.address_string || inspection.location // Only include inspections with location data
        );
        
        inspectionsList.push(...batchInspections);
      }
      
      setInspections(inspectionsList);
    } catch (error) {
      console.error('Error fetching inspections:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const projectsQuery = query(
        collection(db, 'projects'),
        where('manager_id', '==', user.uid),
        where('deleted_at', '==', null)
      );
      
      const snapshot = await getDocs(projectsQuery);
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setProjects(projectsList);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  // Geocoding function (simplified - in production you'd use a proper geocoding service)
  const getCoordinatesFromLocation = (city, state) => {
    // This is a simplified mapping - in production, use a proper geocoding service
    const locationMap = {
      'Florianópolis,SC': [-27.5954, -48.5480],
      'São Paulo,SP': [-23.5505, -46.6333],
      'Rio de Janeiro,RJ': [-22.9068, -43.1729],
      'Belo Horizonte,MG': [-19.9167, -43.9345],
      'Brasília,DF': [-15.8267, -47.9218],
      'Salvador,BA': [-12.9714, -38.5014],
      'Curitiba,PR': [-25.4284, -49.2733],
      'Porto Alegre,RS': [-30.0346, -51.2177],
      'Recife,PE': [-8.0476, -34.8770],
      'Fortaleza,CE': [-3.7319, -38.5267]
    };
    
    const key = `${city},${state}`;
    return locationMap[key] || defaultCenter;
  };

  // Get coordinates for inspection based on available address data
  const getInspectionCoordinates = (inspection) => {
    // Try to use address object first
    if (inspection.address && inspection.address.city && inspection.address.state) {
      return getCoordinatesFromLocation(inspection.address.city, inspection.address.state);
    }
    
    // Try to parse address_string
    if (inspection.address_string) {
      // Parse "Rua Humaitá, 194, Canto, Florianópolis - SC" format
      const parts = inspection.address_string.split(',');
      if (parts.length >= 3) {
        const cityStatePart = parts[parts.length - 1].trim(); // "Florianópolis - SC"
        const cityStateMatch = cityStatePart.match(/(.+)\s*-\s*([A-Z]{2})$/);
        if (cityStateMatch) {
          const city = cityStateMatch[1].trim();
          const state = cityStateMatch[2].trim();
          return getCoordinatesFromLocation(city, state);
        }
      }
    }
    
    // Try location field as fallback
    if (inspection.location) {
      // If location is a string, try to parse it similarly
      const parts = inspection.location.split(',');
      if (parts.length >= 2) {
        const city = parts[0].trim();
        const state = parts[1].trim();
        return getCoordinatesFromLocation(city, state);
      }
    }
    
    // Default to center if no valid location found
    return defaultCenter;
  };

  // Filter data based on current filters
  const filteredInspectors = useMemo(() => {
    return inspectors.filter(inspector => {
      if (filters.city && filters.city !== 'all' && !inspector.city.toLowerCase().includes(filters.city.toLowerCase())) {
        return false;
      }
      if (filters.state && filters.state !== 'all' && !inspector.state.toLowerCase().includes(filters.state.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [inspectors, filters]);

  const filteredInspections = useMemo(() => {
    return inspections.filter(inspection => {
      // Project filter
      if (filters.project && filters.project !== 'all' && inspection.project_id !== filters.project) {
        return false;
      }
      
      // City filter
      if (filters.city && filters.city !== 'all') {
        const inspectionCity = inspection.address?.city || 
          (inspection.address_string && inspection.address_string.includes(filters.city));
        if (!inspectionCity) return false;
      }
      
      // State filter
      if (filters.state && filters.state !== 'all') {
        const inspectionState = inspection.address?.state || 
          (inspection.address_string && inspection.address_string.includes(filters.state));
        if (!inspectionState) return false;
      }
      
      // Status filter
      if (filters.status && filters.status !== 'all' && inspection.status !== filters.status) {
        return false;
      }
      
      // Date filters
      if (filters.dateFrom || filters.dateTo) {
        const inspectionDate = inspection.scheduled_date ? new Date(inspection.scheduled_date) : null;
        if (!inspectionDate) return false;
        
        if (filters.dateFrom && inspectionDate < new Date(filters.dateFrom)) {
          return false;
        }
        if (filters.dateTo && inspectionDate > new Date(filters.dateTo)) {
          return false;
        }
      }
      
      return true;
    });
  }, [inspections, filters]);

  // Group inspections by location
  const inspectionsByLocation = useMemo(() => {
    const grouped = {};
    filteredInspections.forEach(inspection => {
      const [lat, lng] = getInspectionCoordinates(inspection);
      const key = `${lat},${lng}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          coordinates: [lat, lng],
          inspections: [],
          city: inspection.address?.city || 'Cidade não informada',
          state: inspection.address?.state || 'Estado não informado'
        };
      }
      
      grouped[key].inspections.push(inspection);
    });
    
    return grouped;
  }, [filteredInspections]);

  const clearFilters = () => {
    setFilters({
      project: 'all',
      city: 'all',
      state: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: ''
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'dateFrom' || key === 'dateTo') {
      return value !== '';
    }
    return value !== 'all';
  });

  // Get unique values for filter options
  const uniqueCities = useMemo(() => {
    const cities = new Set();
    inspectors.forEach(inspector => {
      if (inspector.city) cities.add(inspector.city);
    });
    inspections.forEach(inspection => {
      if (inspection.address?.city) cities.add(inspection.address.city);
    });
    return Array.from(cities).sort();
  }, [inspectors, inspections]);

  const uniqueStates = useMemo(() => {
    const states = new Set();
    inspectors.forEach(inspector => {
      if (inspector.state) states.add(inspector.state);
    });
    inspections.forEach(inspection => {
      if (inspection.address?.state) states.add(inspection.address.state);
    });
    return Array.from(states).sort();
  }, [inspectors, inspections]);

  const uniqueProjects = useMemo(() => {
    return projects.sort((a, b) => a.title.localeCompare(b.title));
  }, [projects]);

  const handleLocationClick = (locationData) => {
    if (locationData.inspections.length > 1) {
      setSelectedLocationInspections(locationData.inspections);
      setSelectedLocationCity(locationData.city);
      setSelectedLocationState(locationData.state);
      setShowInspectionDialog(true);
    }
  };

  if (!mapLoaded) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-8 w-32 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Tabs value={mapType} onValueChange={setMapType} className="w-full">
        <div className="flex flex-col gap-4 mb-4">
          {/* Header with tabs and counters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="inspectors" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Lincers
              </TabsTrigger>
              <TabsTrigger value="inspections" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Inspeções
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {mapType === 'inspectors' ? filteredInspectors.length : Object.keys(inspectionsByLocation).length} marcadores
              </Badge>
              {hasActiveFilters && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  Filtros ativos
                </Badge>
              )}
            </div>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4" />
              <h3 className="font-medium">Filtros</h3>
              {hasActiveFilters && (
                <EnhancedButton
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-auto"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </EnhancedButton>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Project Filter - only for inspections */}
              {mapType === 'inspections' && (
                <div className="space-y-2">
                  <Label htmlFor="project-filter" className="text-sm font-medium">Projeto</Label>
                  <Select value={filters.project} onValueChange={(value) => setFilters(prev => ({ ...prev, project: value }))}>
                    <SelectTrigger id="project-filter">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {uniqueProjects.map(project => (
                        <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* City Filter */}
              <div className="space-y-2">
                <Label htmlFor="city-filter" className="text-sm font-medium">Cidade</Label>
                <Select value={filters.city} onValueChange={(value) => setFilters(prev => ({ ...prev, city: value }))}>
                  <SelectTrigger id="city-filter">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* State Filter */}
              <div className="space-y-2">
                <Label htmlFor="state-filter" className="text-sm font-medium">Estado</Label>
                <Select value={filters.state} onValueChange={(value) => setFilters(prev => ({ ...prev, state: value }))}>
                  <SelectTrigger id="state-filter">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter - only for inspections */}
              {mapType === 'inspections' && (
                <div className="space-y-2">
                  <Label htmlFor="status-filter" className="text-sm font-medium">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="canceled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date From Filter - only for inspections */}
              {mapType === 'inspections' && (
                <div className="space-y-2">
                  <Label htmlFor="date-from-filter" className="text-sm font-medium">Data de</Label>
                  <Input
                    id="date-from-filter"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  />
                </div>
              )}

              {/* Date To Filter - only for inspections */}
              {mapType === 'inspections' && (
                <div className="space-y-2">
                  <Label htmlFor="date-to-filter" className="text-sm font-medium">Data até</Label>
                  <Input
                    id="date-to-filter"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="h-[500px] w-full">
            <MapContainer
              center={defaultCenter}
              zoom={defaultZoom}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <TabsContent value="inspectors" className="m-0">
                {filteredInspectors.map((inspector) => {
                  const [lat, lng] = getCoordinatesFromLocation(inspector.city, inspector.state);
                  
                  return (
                    <Marker
                      key={inspector.id}
                      position={[lat, lng]}
                      icon={createCustomIcon('inspector')}
                    >
                      <Popup maxWidth={300} className="inspector-popup">
                        <div className="p-2">
                          <div className="flex items-start gap-3">
                            {inspector.profileImageUrl && (
                              <img 
                                src={inspector.profileImageUrl} 
                                alt={`${inspector.name} ${inspector.last_name}`}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm">
                                {inspector.name} {inspector.last_name}
                              </h3>
                              <p className="text-xs text-muted-foreground mb-2">
                                {inspector.profession}
                              </p>
                              
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="text-xs">
                                    {inspector.city}, {inspector.state}
                                  </span>
                                </div>
                                
                                {inspector.rating && (
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span className="text-xs">
                                      {inspector.rating} ({inspector.rating_count || 0})
                                    </span>
                                  </div>
                                )}
                                
                                {inspector.phonenumber && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    <span className="text-xs">{inspector.phonenumber}</span>
                                  </div>
                                )}
                                
                                {inspector.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    <span className="text-xs">{inspector.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </TabsContent>

              <TabsContent value="inspections" className="m-0">
                {Object.entries(inspectionsByLocation).map(([key, locationData]) => {
                  const [lat, lng] = locationData.coordinates;
                  const inspectionsCount = locationData.inspections.length;
                  
                  // If multiple inspections, show a grouped marker
                  if (inspectionsCount > 1) {
                    return (
                      <Marker
                        key={key}
                        position={[lat, lng]}
                        icon={createCustomIcon('inspection-group', null, inspectionsCount)}
                        eventHandlers={{
                          click: () => handleLocationClick(locationData)
                        }}
                      >
                        <Popup maxWidth={300} className="inspection-popup">
                          <div className="p-2">
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {inspectionsCount} Inspeções
                            </h3>
                            <p className="text-xs text-muted-foreground mb-3">
                              {locationData.city}, {locationData.state}
                            </p>
                            
                            <div className="space-y-2">
                              {locationData.inspections.slice(0, 3).map((inspection, index) => (
                                <div key={inspection.id} className="flex items-center justify-between text-xs">
                                  <span className="truncate mr-2">{inspection.title || 'Inspeção'}</span>
                                  <Badge 
                                    variant="secondary" 
                                    className={`${getStatusColor(inspection.status)} text-xs px-1 py-0`}
                                  >
                                    {getStatusText(inspection.status)}
                                  </Badge>
                                </div>
                              ))}
                              
                              {inspectionsCount > 3 && (
                                <p className="text-xs text-muted-foreground text-center">
                                  +{inspectionsCount - 3} outras...
                                </p>
                              )}
                            </div>
                            
                            <div className="mt-3 pt-2 border-t">
                              <p className="text-xs text-center text-muted-foreground">
                                Clique para ver todas as inspeções
                              </p>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  } else {
                    // Single inspection marker
                    const inspection = locationData.inspections[0];
                    const displayLocation = inspection.address_string || 
                      (inspection.address ? `${inspection.address.street}, ${inspection.address.number}, ${inspection.address.neighborhood}, ${inspection.address.city} - ${inspection.address.state}` : '') ||
                      inspection.location || 
                      'Localização não informada';
                    
                    return (
                      <Marker
                        key={inspection.id}
                        position={[lat, lng]}
                        icon={createCustomIcon('inspection', inspection.status)}
                      >
                        <Popup maxWidth={300} className="inspection-popup">
                          <div className="p-2">
                            <h3 className="font-semibold text-sm mb-2">
                              {inspection.title || 'Inspeção'}
                            </h3>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Status:</span>
                                <Badge 
                                  variant="secondary" 
                                  className={getStatusColor(inspection.status)}
                                >
                                  {getStatusText(inspection.status)}
                                </Badge>
                              </div>
                              
                              <div className="flex items-start gap-1">
                                <MapPin className="h-3 w-3 mt-0.5" />
                                <span className="text-xs">{displayLocation}</span>
                              </div>
                              
                              {inspection.scheduled_date && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">
                                    Data: {new Date(inspection.scheduled_date).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              )}
                              
                              {inspection.cod && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">
                                    Código: {inspection.cod}
                                  </span>
                                </div>
                              )}
                              
                              {inspection.inspector_name && (
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span className="text-xs">{inspection.inspector_name}</span>
                                </div>
                              )}

                              {inspection.area && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">
                                    Área: {inspection.area}m²
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  }
                })}
              </TabsContent>
            </MapContainer>
          </div>
        </div>
      </Tabs>

      {/* Inspection List Dialog */}
      <InspectionListDialog
        open={showInspectionDialog}
        onClose={() => setShowInspectionDialog(false)}
        inspections={selectedLocationInspections}
        city={selectedLocationCity}
        state={selectedLocationState}
      />

      {loading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="text-center">
            <Skeleton className="h-8 w-32 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      )}
    </div>
  );
}