// src/components/MapView.jsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
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

// Google Maps imports
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { getInternalStatus, getInternalStatusText, getInternalStatusColor, getInternalStatusHexColor, getInternalStatusEmoji } from '@/utils/inspection-status';

// Removido - usando funções do utils/inspection-status.js

// Custom marker icons for Google Maps
const getMarkerIcon = (type, status = null, count = null) => {
  // Check if we're in the browser and Google Maps is loaded
  if (typeof window === 'undefined' || !window.google?.maps) {
    return null; // Return null if Google Maps isn't loaded yet
  }
  
  const baseUrl = 'data:image/svg+xml;charset=UTF-8,';
  
  if (type === 'inspector') {
    const svg = `
      <svg width="38" height="50" viewBox="0 0 38 50" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <dropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <!-- Pin shape -->
        <path d="M19 5 C10 5, 3 12, 3 21 C3 30, 19 45, 19 45 C19 45, 35 30, 35 21 C35 12, 28 5, 19 5 Z" 
              fill="#3b82f6" stroke="white" stroke-width="2" filter="url(#shadow)"/>
        <!-- Circle for icon -->
        <circle cx="19" cy="21" r="10" fill="white"/>
        <!-- User icon -->
        <text x="19" y="27" font-family="Arial" font-size="14" font-weight="bold" fill="#3b82f6" text-anchor="middle">🔍</text>
      </svg>
    `;
    return {
      url: baseUrl + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(38, 50),
      anchor: new window.google.maps.Point(19, 45)
    };
  } else if (type === 'inspection-group') {
    const svg = `
      <svg width="44" height="58" viewBox="0 0 44 58" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="groupShadow" x="-50%" y="-50%" width="200%" height="200%">
            <dropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <!-- Pin shape -->
        <path d="M22 5 C12 5, 4 13, 4 23 C4 33, 22 53, 22 53 C22 53, 40 33, 40 23 C40 13, 32 5, 22 5 Z" 
              fill="#8b5cf6" stroke="white" stroke-width="2" filter="url(#groupShadow)"/>
        <!-- Circle for count -->
        <circle cx="22" cy="23" r="12" fill="white"/>
        <!-- Count text -->
        <text x="22" y="29" font-family="Arial" font-size="14" font-weight="bold" fill="#8b5cf6" text-anchor="middle">${count}</text>
      </svg>
    `;
    return {
      url: baseUrl + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(44, 58),
      anchor: new window.google.maps.Point(22, 53)
    };
  } else {
    // Single inspection marker with different colors and better visibility based on internal status
    const color = getInternalStatusHexColor(status);
    const emoji = getInternalStatusEmoji(status);
    
    // Get better visual icons based on status
    let statusIcon = emoji;
    if (status === 'pendente') {
      statusIcon = '⏳';
    } else if (status === 'editada') {
      statusIcon = '✏️';
    } else if (status === 'entregue') {
      statusIcon = '✅';
    }
    
    const svg = `
      <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="inspectionShadow${status}" x="-50%" y="-50%" width="200%" height="200%">
            <dropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <!-- Pin shape -->
        <path d="M18 3 C9 3, 2 10, 2 19 C2 28, 18 45, 18 45 C18 45, 34 28, 34 19 C34 10, 27 3, 18 3 Z" 
              fill="${color}" stroke="white" stroke-width="2" filter="url(#inspectionShadow${status})"/>
        <!-- Circle for icon -->
        <circle cx="18" cy="19" r="9" fill="white"/>
        <!-- Status icon -->
        <text x="18" y="25" font-family="Arial" font-size="12" font-weight="bold" fill="${color}" text-anchor="middle">${statusIcon}</text>
      </svg>
    `;
    return {
      url: baseUrl + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(36, 48),
      anchor: new window.google.maps.Point(18, 45)
    };
  }
};

export default function MapView() {
  const [mapType, setMapType] = useState('inspectors');
  const [inspectors, setInspectors] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocationInspections, setSelectedLocationInspections] = useState([]);
  const [selectedLocationCity, setSelectedLocationCity] = useState('');
  const [selectedLocationState, setSelectedLocationState] = useState('');
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  const [selectedInspector, setSelectedInspector] = useState(null);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [selectedLocationGroup, setSelectedLocationGroup] = useState(null);
  
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
  const defaultCenter = { lat: -14.2350, lng: -51.9253 };
  const defaultZoom = 4;

  useEffect(() => {
    if (user) {
      fetchMapData();
    }
  }, [user]);

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
      // TODO: Restringir por manager_id quando necessário
      const projectsQuery = query(
        collection(db, 'projects'),
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
      'Florianópolis,SC': { lat: -27.5954, lng: -48.5480 },
      'São Paulo,SP': { lat: -23.5505, lng: -46.6333 },
      'Rio de Janeiro,RJ': { lat: -22.9068, lng: -43.1729 },
      'Belo Horizonte,MG': { lat: -19.9167, lng: -43.9345 },
      'Brasília,DF': { lat: -15.8267, lng: -47.9218 },
      'Salvador,BA': { lat: -12.9714, lng: -38.5014 },
      'Curitiba,PR': { lat: -25.4284, lng: -49.2733 },
      'Porto Alegre,RS': { lat: -30.0346, lng: -51.2177 },
      'Recife,PE': { lat: -8.0476, lng: -34.8770 },
      'Fortaleza,CE': { lat: -3.7319, lng: -38.5267 }
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
      if (filters.status && filters.status !== 'all') {
        const internalStatus = getInternalStatus(inspection);
        if (internalStatus !== filters.status) {
          return false;
        }
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
      const coords = getInspectionCoordinates(inspection);
      const key = `${coords.lat},${coords.lng}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          coordinates: coords,
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

  // Close info windows
  const closeInfoWindows = () => {
    setSelectedInspector(null);
    setSelectedInspection(null);
    setSelectedLocationGroup(null);
  };

  if (loading) {
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
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="editada">Editada</SelectItem>
                      <SelectItem value="entregue">Entregue</SelectItem>
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

        <div className="rounded-lg border overflow-hidden relative">
          {/* Map Legend */}
          <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg border shadow-lg p-3 max-w-xs">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Legenda</span>
              <span className="sm:hidden">•</span>
            </h4>
            {mapType === 'inspectors' ? (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px]">🔍</div>
                  <span>Lincers disponíveis</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-500 flex items-center justify-center text-white text-[8px]">⏳</div>
                  <span>Pendente</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center text-white text-[8px]">✏️</div>
                  <span>Editada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500 flex items-center justify-center text-white text-[8px]">✅</div>
                  <span>Entregue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-white text-[8px]">+</div>
                  <span>Múltiplas inspeções</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="h-[500px] w-full">
            <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
              <Map
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ width: '100%', height: '100%' }}
                mapId="map"
                onClick={closeInfoWindows}
                options={{
                  zoomControl: true,
                  zoomControlOptions: {
                    position: 9, // TOP_RIGHT
                  },
                  streetViewControl: true,
                  mapTypeControl: true,
                  fullscreenControl: true,
                  gestureHandling: 'greedy', // Remove the need for Ctrl+scroll
                  scaleControl: true,
                }}
              >
                <TabsContent value="inspectors" className="m-0">
                  {filteredInspectors.map((inspector) => {
                    const position = getCoordinatesFromLocation(inspector.city, inspector.state);
                    const icon = getMarkerIcon('inspector');
                    
                    return (
                      <Marker
                        key={inspector.id}
                        position={position}
                        icon={icon || undefined}
                        onClick={() => {
                          closeInfoWindows();
                          setSelectedInspector(inspector);
                        }}
                      />
                    );
                  })}

                  {/* Inspector Info Window */}
                  {selectedInspector && (
                    <InfoWindow
                      position={getCoordinatesFromLocation(selectedInspector.city, selectedInspector.state)}
                      onCloseClick={() => setSelectedInspector(null)}
                    >
                      <div className="p-2 max-w-xs">
                        <div className="flex items-start gap-3">
                          {selectedInspector.profileImageUrl && (
                            <img 
                              src={selectedInspector.profileImageUrl} 
                              alt={`${selectedInspector.name} ${selectedInspector.last_name}`}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">
                              {selectedInspector.name} {selectedInspector.last_name}
                            </h3>
                            <p className="text-xs text-muted-foreground mb-2">
                              {selectedInspector.profession}
                            </p>
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="text-xs">
                                  {selectedInspector.city}, {selectedInspector.state}
                                </span>
                              </div>
                              
                              {selectedInspector.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs">
                                    {selectedInspector.rating} ({selectedInspector.rating_count || 0})
                                  </span>
                                </div>
                              )}
                              
                              {selectedInspector.phonenumber && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span className="text-xs">{selectedInspector.phonenumber}</span>
                                </div>
                              )}
                              
                              {selectedInspector.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  <span className="text-xs">{selectedInspector.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </TabsContent>

                <TabsContent value="inspections" className="m-0">
                  {Object.entries(inspectionsByLocation).map(([key, locationData]) => {
                    const position = locationData.coordinates;
                    const inspectionsCount = locationData.inspections.length;
                    
                    // If multiple inspections, show a grouped marker
                    if (inspectionsCount > 1) {
                      const icon = getMarkerIcon('inspection-group', null, inspectionsCount);
                      return (
                        <Marker
                          key={key}
                          position={position}
                          icon={icon || undefined}
                          onClick={() => {
                            closeInfoWindows();
                            setSelectedLocationGroup(locationData);
                            handleLocationClick(locationData);
                          }}
                        />
                      );
                    } else {
                      // Single inspection marker
                      const inspection = locationData.inspections[0];
                      const internalStatus = getInternalStatus(inspection);
                      const icon = getMarkerIcon('inspection', internalStatus);
                      
                      return (
                        <Marker
                          key={inspection.id}
                          position={position}
                          icon={icon || undefined}
                          onClick={() => {
                            closeInfoWindows();
                            setSelectedInspection(inspection);
                          }}
                        />
                      );
                    }
                  })}

                  {/* Single Inspection Info Window */}
                  {selectedInspection && (
                    <InfoWindow
                      position={getInspectionCoordinates(selectedInspection)}
                      onCloseClick={() => setSelectedInspection(null)}
                    >
                      <div className="p-2 max-w-xs">
                        <h3 className="font-semibold text-sm mb-2">
                          {selectedInspection.title || 'Inspeção'}
                        </h3>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Status:</span>
                            <Badge 
                              className={getInternalStatusColor(getInternalStatus(selectedInspection))}
                            >
                              {getInternalStatusText(getInternalStatus(selectedInspection))}
                            </Badge>
                          </div>
                          
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 mt-0.5" />
                            <span className="text-xs">
                              {selectedInspection.address_string || 
                               (selectedInspection.address ? `${selectedInspection.address.street}, ${selectedInspection.address.number}, ${selectedInspection.address.neighborhood}, ${selectedInspection.address.city} - ${selectedInspection.address.state}` : '') ||
                               selectedInspection.location || 
                               'Localização não informada'}
                            </span>
                          </div>
                          
                          {selectedInspection.scheduled_date && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                Data: {new Date(selectedInspection.scheduled_date).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                          
                          {selectedInspection.cod && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                Código: {selectedInspection.cod}
                              </span>
                            </div>
                          )}
                          
                          {selectedInspection.inspector_name && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span className="text-xs">{selectedInspection.inspector_name}</span>
                            </div>
                          )}

                          {selectedInspection.area && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                Área: {selectedInspection.area}m²
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </TabsContent>
              </Map>
            </APIProvider>
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
    </div>
  );
}