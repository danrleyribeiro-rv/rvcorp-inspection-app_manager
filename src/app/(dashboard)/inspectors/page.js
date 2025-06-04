// app/(dashboard)/inspectors/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, increment, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  MessageCircle,
  Star,
  Filter,
  MapPin,
  Building,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import InspectorCard from "./components/InspectorCard";
import RatingDialog from "./components/RatingDialog";
import InspectorProfileDialog from "./components/InspectorProfileDialog";

export default function InspectorsPage() {
  const [inspectors, setInspectors] = useState([]);
  const [filteredInspectors, setFilteredInspectors] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedInspector, setSelectedInspector] = useState(null);
  const [profileInspector, setProfileInspector] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    state: "all",
    city: "all",
    rating: "all",
  });
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchInspectors();
  }, []);

  useEffect(() => {
    if (inspectors.length > 0) {
      updateLocationFilters();
      applyFilters();
    }
  }, [inspectors, search, filters]);

  useEffect(() => {
    if (filters.state !== "all") {
      updateCities(filters.state);
    }
  }, [filters.state]);

  const fetchInspectors = async () => {
    setLoading(true);
    try {
      // Query for active inspectors
      const inspectorsQuery = query(
        collection(db, 'inspectors'),
        where('deleted_at', '==', null)
      );
      
      const inspectorsSnapshot = await getDocs(inspectorsQuery);
      
      // Process inspector data
      const inspectorsList = [];
      
      for (const doc of inspectorsSnapshot.docs) {
        const inspectorData = {
          id: doc.id,
          ...doc.data()
        };
        
        // Não precisa mais buscar profile_images separadamente
        // pois a URL está no campo profileImageUrl do documento
        
        inspectorsList.push(inspectorData);
      }
      
      setInspectors(inspectorsList);
      setFilteredInspectors(inspectorsList);
    } catch (error) {
      console.error("Error fetching inspectors:", error);
      toast({
        title: "Erro ao buscar vistoriadores",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLocationFilters = () => {
    // Extract unique states from inspectors
    const uniqueStates = [...new Set(inspectors
      .map(inspector => inspector.state)
      .filter(Boolean))]
      .sort();
    
    setStates(uniqueStates);
  };

  const updateCities = (selectedState) => {
    // Extract unique cities from the selected state
    const uniqueCities = [...new Set(
      inspectors
        .filter(inspector => inspector.state === selectedState)
        .map(inspector => inspector.city)
    )]
      .filter(Boolean)
      .sort();
    
    setCities(uniqueCities);
    
    // Reset selected city if it doesn't exist in the new state
    if (!uniqueCities.includes(filters.city)) {
      setFilters(prev => ({ ...prev, city: "all" }));
    }
  };

  const applyFilters = () => {
    let filtered = [...inspectors];
    
    // Search filter
    if (search) {
      filtered = filtered.filter(
        (inspector) =>
          inspector.name?.toLowerCase().includes(search.toLowerCase()) ||
          inspector.last_name?.toLowerCase().includes(search.toLowerCase()) ||
          inspector.email?.toLowerCase().includes(search.toLowerCase()) ||
          inspector.profession?.toLowerCase().includes(search.toLowerCase()) ||
          inspector.training?.some(t => t.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    // State filter
    if (filters.state && filters.state !== "all") {
      filtered = filtered.filter(
        (inspector) => inspector.state === filters.state
      );
    }
    
    // City filter
    if (filters.city && filters.city !== "all") {
      filtered = filtered.filter(
        (inspector) => inspector.city === filters.city
      );
    }
    
    // Rating filter
    if (filters.rating && filters.rating !== "all") {
      const ratingValue = parseInt(filters.rating);
      filtered = filtered.filter(
        (inspector) => {
          const rating = parseFloat(inspector.rating) || 0;
          return rating >= ratingValue;
        }
      );
    }
    
    setFilteredInspectors(filtered);
  };

const handleRateInspector = async (inspector, ratingData) => {
  try {
    // Busca avaliações existentes do inspetor
    const ratingsQuery = query(
      collection(db, 'inspector_ratings'),
      where('inspector_id', '==', inspector.id)
    );
    
    const ratingsSnapshot = await getDocs(ratingsQuery);
    
    // Processa todas as avaliações existentes
    const existingRatings = [];
    let userHasRated = false;
    let userRatingDocId = null;

    ratingsSnapshot.docs.forEach(doc => {
      const rating = { id: doc.id, ...doc.data() };
      if (rating.manager_id === ratingData.manager_id) {
        userHasRated = true;
        userRatingDocId = doc.id;
      }
      existingRatings.push(rating);
    });

    // Adiciona ou atualiza a avaliação do usuário atual
    if (userHasRated) {
      // Atualiza avaliação existente
      await updateDoc(doc(db, 'inspector_ratings', userRatingDocId), {
        ...ratingData,
        updated_at: serverTimestamp()
      });
      
      // Atualiza no array local
      const updatedRatings = existingRatings.map(rating => 
        rating.id === userRatingDocId 
          ? { ...rating, ...ratingData }
          : rating
      );
      existingRatings.splice(0, existingRatings.length, ...updatedRatings);
    } else {
      // Cria nova avaliação
      const newRatingRef = await addDoc(collection(db, 'inspector_ratings'), {
        inspector_id: inspector.id,
        ...ratingData,
        created_at: serverTimestamp()
      });
      
      existingRatings.push({
        id: newRatingRef.id,
        inspector_id: inspector.id,
        ...ratingData
      });
    }

    // Calcula nova média geral
    const allRatings = existingRatings.map(r => r.overall_rating);
    const newAverageRating = allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;

    // Atualiza documento do inspetor
    const inspectorRef = doc(db, 'inspectors', inspector.id);
    await updateDoc(inspectorRef, {
      rating: newAverageRating.toFixed(1),
      rating_count: allRatings.length,
      detailed_ratings: existingRatings.map(({ id, ...rating }) => rating), // Remove IDs para salvar no documento
      updated_at: serverTimestamp()
    });

    toast({
      title: userHasRated ? "Avaliação atualizada com sucesso" : "Avaliação enviada com sucesso"
    });

    // Recarrega dados
    fetchInspectors();
  } catch (error) {
    console.error("Error rating inspector:", error);
    toast({
      title: "Erro ao enviar avaliação",
      description: error.message,
      variant: "destructive"
    });
  }
};

  const handleViewProfile = (inspector) => {
    setProfileInspector(inspector);
  };

  return (
    <div className="container p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vistoriadores</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm">Estado</label>
                <Select
                  value={filters.state}
                  onValueChange={(value) => setFilters({ ...filters, state: value, city: "all" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os estados</SelectItem>
                    {states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm">Cidade</label>
                <Select
                  value={filters.city}
                  onValueChange={(value) => setFilters({ ...filters, city: value })}
                  disabled={filters.state === "all"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filters.state !== "all" ? "Selecione uma cidade" : "Selecione um estado primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as cidades</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm">Classificação</label>
                <Select
                  value={filters.rating}
                  onValueChange={(value) => setFilters({ ...filters, rating: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma classificação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as classificações</SelectItem>
                    <SelectItem value="5">5 estrelas</SelectItem>
                    <SelectItem value="4">4 estrelas ou mais</SelectItem>
                    <SelectItem value="3">3 estrelas ou mais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Barra de pesquisa */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, profissão ou especialização..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {search && (
          <p className="text-sm text-muted-foreground mt-2">
            {filteredInspectors.length} vistoriador(es) encontrado(s) para "{search}"
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredInspectors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search || filters.state !== "all" || filters.city !== "all" || filters.rating !== "all" 
            ? "Nenhum vistoriador encontrado com os filtros atuais."
            : "Nenhum vistoriador cadastrado no sistema."
          }
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInspectors.map((inspector) => (
            <InspectorCard
              key={inspector.id}
              inspector={inspector}
              onRate={() => setSelectedInspector(inspector)}
              onViewProfile={() => handleViewProfile(inspector)}
            />
          ))}
        </div>
      )}

      {/* Dialog de avaliação */}
      {selectedInspector && (
        <RatingDialog
          inspector={selectedInspector}
          open={!!selectedInspector}
          onClose={() => setSelectedInspector(null)}
          onRate={handleRateInspector}
        />
      )}

      {/* Dialog de perfil */}
      {profileInspector && (
        <InspectorProfileDialog
          inspector={profileInspector}
          open={!!profileInspector}
          onClose={() => setProfileInspector(null)}
        />
      )}
    </div>
  );
}