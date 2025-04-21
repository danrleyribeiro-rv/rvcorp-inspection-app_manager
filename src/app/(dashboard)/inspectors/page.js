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
  Building
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

export default function InspectorsPage() {
  const [inspectors, setInspectors] = useState([]);
  const [filteredInspectors, setFilteredInspectors] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedInspector, setSelectedInspector] = useState(null);
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
        
        // Fetch profile images if they exist
        if (inspectorData.profile_image_id) {
          try {
            const imagesQuery = query(
              collection(db, 'profile_images'),
              where('inspector_id', '==', doc.id)
            );
            
            const imagesSnapshot = await getDocs(imagesQuery);
            
            const images = imagesSnapshot.docs.map(imgDoc => ({
              id: imgDoc.id,
              ...imgDoc.data()
            }));
            
            inspectorData.profile_images = images;
          } catch (err) {
            console.error("Error fetching inspector images:", err);
          }
        }
        
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
          inspector.email?.toLowerCase().includes(search.toLowerCase())
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
        (inspector) => (parseFloat(inspector.rating) || 0) >= ratingValue
      );
    }
    
    setFilteredInspectors(filtered);
  };

  const openChat = (inspector) => {
    // Navigate to chat with selected inspector
    router.push(`/chats?inspector=${inspector.id}`);
  };

  const handleRateInspector = async (inspector, rating, comment) => {
    try {
      // Calculate new average rating
      const currentRating = parseFloat(inspector.rating) || 0;
      const ratingCount = inspector.rating_count || 0;
      
      const newRatingCount = ratingCount + 1;
      const newAverageRating = ((currentRating * ratingCount) + rating) / newRatingCount;
      
      // Update inspector rating in Firestore
      const inspectorRef = doc(db, 'inspectors', inspector.id);
      
      await updateDoc(inspectorRef, {
        rating: newAverageRating.toFixed(1),
        rating_count: increment(1),
        updated_at: serverTimestamp()
      });
      
      // Store rating record
      await addDoc(collection(db, 'inspector_ratings'), {
        inspector_id: inspector.id,
        rater_id: null, // Could be the manager's ID if needed
        rating,
        comment,
        created_at: serverTimestamp()
      });
      
      toast({
        title: "Avaliação enviada com sucesso"
      });
      
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

      <div className="mb-6">
        <Input
          placeholder="Buscar vistoriador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredInspectors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum vistoriador encontrado com os filtros atuais.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInspectors.map((inspector) => (
            <InspectorCard
              key={inspector.id}
              inspector={inspector}
              onRate={() => setSelectedInspector(inspector)}
              onChat={() => openChat(inspector)}
            />
          ))}
        </div>
      )}

      {selectedInspector && (
        <RatingDialog
          inspector={selectedInspector}
          open={!!selectedInspector}
          onClose={() => setSelectedInspector(null)}
          onRate={handleRateInspector}
        />
      )}
    </div>
  );
}