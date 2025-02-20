// src/app/(dashboard)/inspections/components/InspectionDetailsDialog.js
"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getS3Url } from "@/lib/s3";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  DragDropContext, 
  Droppable, 
  Draggable 
} from "@hello-pangea/dnd";
import { toast } from "@/hooks/use-toast";
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  MoveVertical,
  Image,
  Video 
} from "lucide-react";

export default function InspectionDetailsDialog({ inspection, open, onClose }) {
  const [rooms, setRooms] = useState(inspection.rooms || []);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [mediaUrls, setMediaUrls] = useState({});

  useEffect(() => {
    if (inspection.completed) {
      loadMediaUrls();
    }
  }, [inspection]);

  const loadMediaUrls = async () => {
    const urls = {};
    for (const room of inspection.rooms) {
      for (const item of room.items) {
        for (const detail of item.details) {
          if (detail.media) {
            for (const media of detail.media) {
              urls[media.key] = await getS3Url(media.key);
            }
          }
        }
      }
    }
    setMediaUrls(urls);
  };

  const handleSaveChanges = async () => {
    try {
      await updateDoc(doc(db, "inspections", inspection.id), {
        rooms,
        updatedAt: new Date().toISOString()
      });
      toast({
        title: "Sucesso",
        description: "Alterações salvas com sucesso"
      });
      onClose();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar alterações",
        variant: "destructive"
      });
    }
  };

  const handleHideItem = (roomIndex, itemIndex) => {
    const newRooms = [...rooms];
    newRooms[roomIndex].items[itemIndex].hidden = 
      !newRooms[roomIndex].items[itemIndex].hidden;
    setRooms(newRooms);
  };

  const handleDuplicateItem = (roomIndex, itemIndex) => {
    const newRooms = [...rooms];
    const itemToDuplicate = {...newRooms[roomIndex].items[itemIndex]};
    newRooms[roomIndex].items.splice(itemIndex + 1, 0, itemToDuplicate);
    setRooms(newRooms);
  };

  const handleRemoveItem = (roomIndex, itemIndex) => {
    const newRooms = [...rooms];
    newRooms[roomIndex].items.splice(itemIndex, 1);
    setRooms(newRooms);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const [sourceRoom, sourceItem] = source.droppableId.split('-');
    const [destRoom, destItem] = destination.droppableId.split('-');

    const newRooms = [...rooms];

    // Mover item entre dependências
    if (sourceRoom !== destRoom) {
      const itemToMove = newRooms[sourceRoom].items[source.index];
      newRooms[sourceRoom].items.splice(source.index, 1);
      newRooms[destRoom].items.splice(destination.index, 0, itemToMove);
    }
    // Reordenar itens na mesma dependência
    else {
      const [removed] = newRooms[sourceRoom].items.splice(source.index, 1);
      newRooms[sourceRoom].items.splice(destination.index, 0, removed);
    }

    setRooms(newRooms);
  };

  const handleEditResponse = (roomIndex, itemIndex, detailIndex, newValue) => {
    const newRooms = [...rooms];
    newRooms[roomIndex].items[itemIndex].details[detailIndex].response = newValue;
    setRooms(newRooms);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Detalhes da Inspeção</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[300px,1fr] gap-4 h-full">
          {/* Lista de Dependências */}
          <div className="border-r pr-4">
            <h3 className="font-semibold mb-4">Dependências</h3>
            <div className="space-y-2">
              {rooms.map((room, roomIndex) => (
                <Button
                  key={roomIndex}
                  variant={selectedRoom === roomIndex ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedRoom(roomIndex)}
                >
                  {room.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Detalhes da Dependência Selecionada */}
          <div className="overflow-y-auto">
            {selectedRoom !== null && (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold mb-4">
                    {rooms[selectedRoom].name}
                  </h2>

                  {rooms[selectedRoom].items.map((item, itemIndex) => (
                    <Droppable 
                      key={`${selectedRoom}-${itemIndex}`}
                      droppableId={`${selectedRoom}-${itemIndex}`}
                    >
                      {(provided) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={item.hidden ? "opacity-50" : ""}
                        >
                          <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{item.name}</CardTitle>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleHideItem(selectedRoom, itemIndex)}
                              >
                                {item.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicateItem(selectedRoom, itemIndex)}
                              >
                                <Copy size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(selectedRoom, itemIndex)}
                              >
                                <Trash2 size={16} />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <MoveVertical size={16} />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {item.details.map((detail, detailIndex) => (
                                <div key={detailIndex} className="space-y-2">
                                  <h4 className="font-medium">{detail.name}</h4>
                                  
                                  {/* Respostas */}
                                  {detail.type === "text" && (
                                    <Input
                                      value={detail.response || ""}
                                      onChange={(e) => handleEditResponse(
                                        selectedRoom,
                                        itemIndex,
                                        detailIndex,
                                        e.target.value
                                      )}
                                    />
                                  )}
                                  
                                  {detail.type === "select" && (
                                    <Select
                                      value={detail.response || ""}
                                      onValueChange={(value) => handleEditResponse(
                                        selectedRoom,
                                        itemIndex,
                                        detailIndex,
                                        value
                                      )}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {detail.options.map((option) => (
                                          <SelectItem key={option} value={option}>
                                            {option}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}

                                  {/* Mídia */}
                                  {detail.media && (
                                    <div className="grid grid-cols-4 gap-4">
                                      {detail.media.map((media, mediaIndex) => (
                                        <div key={mediaIndex} className="relative">
                                          {media.type === "image" ? (
                                            <img
                                              src={mediaUrls[media.key]}
                                              alt=""
                                              className="w-full h-32 object-cover rounded-lg"
                                            />
                                          ) : (
                                            <video
                                              src={mediaUrls[media.key]}
                                              controls
                                              className="w-full h-32 object-cover rounded-lg"
                                            />
                                          )}
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            className="absolute top-2 right-2"
                                            onClick={() => handleRemoveMedia(
                                              selectedRoom,
                                              itemIndex,
                                              detailIndex,
                                              mediaIndex
                                            )}
                                          >
                                            <Trash2 size={12} />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Droppable>
                  ))}
                </div>
              </DragDropContext>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSaveChanges}>
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}