// src/app/(dashboard)/chats/components/FileUpload.jsx
"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Image, File, Video, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function FileUpload({ onFileSelect, onCancel, selectedFile }) {
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 100MB",
        variant: "destructive"
      });
      return;
    }
    
    onFileSelect(file);
    e.target.value = '';
  };

  const getFileIcon = () => {
    if (!selectedFile) return <File className="h-5 w-5" />;
    
    if (selectedFile.type.startsWith('image/')) {
      return <Image className="h-5 w-5" />;
    } else if (selectedFile.type.startsWith('video/')) {
      return <Video className="h-5 w-5" />;
    } else {
      return <File className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {selectedFile ? (
        <div className="p-2 bg-accent/50 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getFileIcon()}
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate max-w-[150px]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {progress > 0 && progress < 100 && (
            <Progress value={progress} />
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          className="w-full"
        >
          <File className="mr-2 h-4 w-4" />
          Attach File
        </Button>
      )}
    </div>
  );
}