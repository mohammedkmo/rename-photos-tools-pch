"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FileUp, X } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";

interface CustomFileUploadProps {
  onChange: (file: File | null) => void;
  label: string;
  initialFile?: File;
  maxSizeMB?: number;
  acceptedFileTypes?: string[];
}

// Kept outside the component so its identity is stable across renders,
// otherwise the preview is regenerated on every keystroke in the form.
const DEFAULT_ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif"];

const CustomFileUpload: React.FC<CustomFileUploadProps> = ({
  onChange,
  label,
  initialFile,
  maxSizeMB = 10,
  acceptedFileTypes = DEFAULT_ACCEPTED_FILE_TYPES,
}) => {
  const [fileName, setFileName] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [error, setError] = useState<string>("");

  const validateFile = useCallback(
    (file: File): boolean => {
      setError("");

      if (!acceptedFileTypes.includes(file.type)) {
        setError("Invalid file type. Please upload an image file.");
        return false;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File size must be less than ${maxSizeMB}MB`);
        return false;
      }

      return true;
    },
    [maxSizeMB, acceptedFileTypes]
  );

  const generatePreview = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.onerror = () => {
      setError("Error reading file");
    };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    if (initialFile && validateFile(initialFile)) {
      setFileName(initialFile.name);
      generatePreview(initialFile);
    }
  }, [initialFile, validateFile, generatePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError("");

    if (file) {
      if (validateFile(file)) {
        setFileName(file.name);
        onChange(file);
        generatePreview(file);
      } else {
        e.target.value = "";
      }
    }
  };

  const handleDelete = () => {
    setFileName("");
    setImagePreview("");
    setError("");
    onChange(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (validateFile(file)) {
        setFileName(file.name);
        onChange(file);
        generatePreview(file);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {imagePreview ? (
          <div className="relative h-full w-full">
            <div className="w-full h-60 rounded-lg overflow-hidden bg-gray-100">
              <label className="cursor-pointer block w-full h-full group relative">
                <Image
                  className="object-cover w-full h-full hover:opacity-90 transition-opacity"
                  src={imagePreview}
                  width={400}
                  height={160}
                  alt="Preview"
                  priority
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm">Click to change image</span>
                </div>
                <Input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept={acceptedFileTypes.join(",")}
                />
              </label>
            </div>
            <div className="flex items-center justify-center gap-x-2 absolute top-2 right-2">
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center justify-center px-2 p-1.5 bg-red-500/40 backdrop-blur-md rounded-full hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Remove image"
                title="Remove image"
              >
                <X className="h-4 w-4 text-white" />
                <span className="text-white text-xs">Remove</span>
              </button>
            </div>
          </div>
        ) : (
          <label className="file-upload-label p-4 flex items-center justify-center cursor-pointer text-sm">
            <FileUp className="file-upload-icon h-5 w-5" />
            <span className="truncate">{label}</span>
            <Input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept={acceptedFileTypes.join(",")}
            />
          </label>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};

export default CustomFileUpload;
