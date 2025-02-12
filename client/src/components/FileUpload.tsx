import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  setImages: (images: string[]) => void;
  images: string[];
  className?: string;
}

export function FileUpload({ setImages, images, className }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.data.url;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    setUploading(true);
    const totalFiles = files.length;
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const url = await uploadImage(files[i]);
        uploadedUrls.push(url);
        setProgress(((i + 1) / totalFiles) * 100);
      }

      setImages([...images, ...uploadedUrls]);
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        onChange={handleFileChange}
        multiple
        accept="image/*"
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-primary file:text-primary-foreground
          hover:file:bg-primary/90"
      />
      {uploading && (
        <div className="mt-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-500 mt-1">
            Качване... {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );
}