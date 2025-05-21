// src/hooks/useFileUpload.js
import { useState } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';

export function useFileUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  
  const uploadFile = async (file, path) => {
    if (!file) return { success: false, error: 'No file provided' };
    
    try {
      setUploading(true);
      setProgress(10);
      
      // Create storage reference
      const storageRef = ref(storage, path);
      
      // Upload file
      const uploadTask = await uploadBytes(storageRef, file);
      setProgress(70);
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadTask.ref);
      setProgress(100);
      
      return {
        success: true,
        url: downloadURL,
        path: uploadTask.ref.fullPath,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
      return { success: false, error: error.message };
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };
  
  return { uploadFile, progress, uploading };
}