import { useState } from "react";
import { FileInput } from "@/components/ui/file-input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Client } from "replit-storage";

interface FileUploadProps {
  setImages: (images: string[]) => void;
  images: string[];
  className?: string;
}

export function FileUpload({ setImages, images, className }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const client = new Client();

  const handleFileChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    setUploading(true);

    try {
      const newImages = await Promise.all(
        selectedFiles.map(async (file) => {
          const uploadStream = client.uploadStream(file.name, file);

          uploadStream.on('progress', (progress) => {
            setProgress(progress.percentage);
          });

          return new Promise((resolve, reject) => {
            uploadStream.on('finish', (data) => {
              resolve(data.url);
            });

            uploadStream.on('error', (error) => {
              reject(error);
            });
          });
        })
      );

      setImages([...images, ...newImages]); 
      setSelectedFiles([]);
      setUploading(false);
      setProgress(0);
    } catch (error) {
      console.error("Error uploading files:", error);
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className={className}>
      <FileInput 
        onChange={handleFileChange}
        multiple={true}
      />
      {selectedFiles.length > 0 && (
        <div className="mt-2">
          <Button variant="primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Качване..." : "Качи снимки"}
          </Button>
          {uploading && <Progress value={progress} className="mt-2" />}
        </div>
      )}
    </div>
  );
}