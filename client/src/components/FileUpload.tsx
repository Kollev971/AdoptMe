import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  setImages: (images: string[]) => void;
  images: string[];
  className?: string;
}

export function FileUpload({ setImages, images, className }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Hardcoded API key for ImgBB
  const apiKey = 'a662e0016a5d8465729dc716459966fa';

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('ImgBB API error:', errorData);
        throw new Error(errorData.error?.message || `Upload failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        console.error('ImgBB upload failed:', data.error);
        throw new Error(data.error?.message || 'Failed to upload image');
      }

      return data.data.url;
    } catch (error: any) {
      console.error('Error uploading to ImgBB:', error);
      throw error;
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    const validFiles = Array.from(files).filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB max

      if (!isValidType) {
        toast({
          title: "Невалиден файл",
          description: "Моля, изберете само изображения.",
          variant: "destructive",
        });
        return false;
      }

      if (!isValidSize) {
        toast({
          title: "Файлът е твърде голям",
          description: "Максималният размер на файла е 5MB.",
          variant: "destructive",
        });
        return false;
      }

      return true;
    });

    if (!validFiles.length) return;

    setUploading(true);
    const totalFiles = validFiles.length;
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < validFiles.length; i++) {
        try {
          const url = await uploadImage(validFiles[i]);
          uploadedUrls.push(url);
          setProgress(((i + 1) / totalFiles) * 100);
        } catch (error: any) {
          console.error(`Error uploading file ${i + 1}:`, error);
          toast({
            title: "Грешка при качване",
            description: `Файл ${i + 1} не можа да бъде качен: ${error.message}`,
            variant: "destructive",
          });
        }
      }

      if (uploadedUrls.length > 0) {
        setImages([...images, ...uploadedUrls]);
        toast({
          title: "Успешно качване",
          description: `${uploadedUrls.length} ${uploadedUrls.length === 1 ? 'снимка беше качена' : 'снимки бяха качени'} успешно.`,
        });
      }
    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast({
        title: "Грешка",
        description: error.message || "Възникна проблем при качването на снимките.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
      event.target.value = '';
    }
  };

  return (
    <div className={className}>
      <div className="relative">
        <input
          type="file"
          onChange={handleFileChange}
          multiple
          accept="image/*"
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0 file:text-sm file:font-semibold
            file:bg-primary file:text-primary-foreground hover:file:bg-primary/90
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {uploading && (
          <div className="mt-2 space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Качване... {Math.round(progress)}%
            </p>
          </div>
        )}
      </div>
      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
              <img 
                src={img} 
                alt={`Upload ${index + 1}`} 
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setImages(images.filter((_, i) => i !== index))}
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="text-white text-sm">Премахни</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}