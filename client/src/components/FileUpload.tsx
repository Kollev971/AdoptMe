import { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    setUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      const storageRef = ref(storage, `listings/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setProgress(progress);
          },
          (error) => {
            console.error("Error uploading file:", error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    });

    try {
      const downloadURLs = await Promise.all(uploadPromises);
      setImages([...images, ...downloadURLs]);
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