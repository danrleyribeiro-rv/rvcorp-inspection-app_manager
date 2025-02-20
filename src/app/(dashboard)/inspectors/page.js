// src/app/(dashboard)/inspectors/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import RatingDialog from "./components/RatingDialog";
import InspectorCard from "./components/InspectorCard";

export default function InspectorsPage() {
    const [inspectors, setInspectors] = useState([]);
    const [filteredInspectors, setFilteredInspectors] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [selectedInspector, setSelectedInspector] = useState(null);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({
        state: "all",
        city: "all",
        rating: "all",
      });
  
    useEffect(() => {
      fetchInspectors();
    }, []);
  
    useEffect(() => {
      if (inspectors.length > 0) {
        updateLocationFilters();
      }
    }, [inspectors]);
  
    useEffect(() => {
      if (filters.state) {
        updateCities(filters.state);
      }
    }, [filters.state]);
  
    const fetchInspectors = async () => {
      const inspectorsRef = collection(db, "inspectors");
      const inspectorsSnap = await getDocs(inspectorsRef);
      const inspectorsData = inspectorsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInspectors(inspectorsData);
      setFilteredInspectors(inspectorsData);
    };
  
    const updateLocationFilters = () => {
      // Extrair estados únicos dos inspetores
      const uniqueStates = [...new Set(inspectors.map(inspector => inspector.state))]
        .filter(Boolean) // Remove valores null/undefined
        .sort(); // Ordena alfabeticamente
      setStates(uniqueStates);
    };
  
    const updateCities = (selectedState) => {
      // Extrair cidades únicas do estado selecionado
      const uniqueCities = [...new Set(
        inspectors
          .filter(inspector => inspector.state === selectedState)
          .map(inspector => inspector.city)
      )]
        .filter(Boolean)
        .sort();
      setCities(uniqueCities);
  
      // Resetar cidade selecionada se ela não existe no novo estado
      if (!uniqueCities.includes(filters.city)) {
        setFilters(prev => ({ ...prev, city: "" }));
      }
    };
  
    const applyFilters = () => {
        let filtered = [...inspectors];
      
        if (search) {
          filtered = filtered.filter(
            (inspector) =>
              inspector.name.toLowerCase().includes(search.toLowerCase()) ||
              inspector.email.toLowerCase().includes(search.toLowerCase())
          );
        }
      
        if (filters.state && filters.state !== "todos") {
          filtered = filtered.filter(
            (inspector) => inspector.state === filters.state
          );
        }
        
        if (filters.city && filters.city !== "todas") {
          filtered = filtered.filter(
            (inspector) => inspector.city === filters.city
          );
        }
        
        if (filters.rating && filters.rating !== "todas") {
          const ratingValue = parseInt(filters.rating);
          filtered = filtered.filter(
            (inspector) => (inspector.rating || 0) >= ratingValue
          );
        }
      
        setFilteredInspectors(filtered);
      };

  const openChat = (inspector) => {
    router.push(`/chats?inspector=${inspector.id}`);
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

      {selectedInspector && (
        <RatingDialog
          inspector={selectedInspector}
          open={!!selectedInspector}
          onClose={() => setSelectedInspector(null)}
          onSuccess={fetchInspectors}
        />
      )}
    </div>
  );
}