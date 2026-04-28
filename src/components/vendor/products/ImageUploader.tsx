"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface ImageUploaderProps {
  /** Already-saved image URLs (from DB) */
  existingUrls?: string[];
  /** Called when user removes a saved URL */
  onRemoveExisting?: (url: string) => void;
  /** New local files selected by the user */
  files: File[];
  onChange: (files: File[]) => void;
}

/** Compress + resize an image File to stay under maxBytes (default 4 MB). */
async function compressImage(
  file: File,
  maxBytes = 4 * 1024 * 1024,
): Promise<File> {
  // If already small enough, skip compression
  if (file.size <= maxBytes) return file;

  return new Promise((resolve) => {
    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      // Scale down proportionally — start at original, reduce until size fits
      let { width, height } = img;
      let quality = 0.85;
      const MAX_DIM = 2000;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      const tryEncode = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            if (blob.size <= maxBytes || quality <= 0.4) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              quality -= 0.1;
              tryEncode();
            }
          },
          "image/jpeg",
          quality,
        );
      };
      tryEncode();
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export function ImageUploader({
  existingUrls = [],
  onRemoveExisting,
  files,
  onChange,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const { t } = useLanguage();

  async function handleFiles(incoming: FileList | null) {
    if (!incoming) return;
    const valid = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (valid.length === 0) return;
    setCompressing(true);
    try {
      const compressed = await Promise.all(valid.map((f) => compressImage(f)));
      onChange([...files, ...compressed]);
    } finally {
      setCompressing(false);
    }
  }

  function removeFile(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    await handleFiles(e.dataTransfer.files);
  }

  const totalCount = existingUrls.length + files.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {t("vendor.wpImagesTitle")}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {t("vendor.wpImagesSubtitle")}
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
          dragging
            ? "border-slate-900 bg-slate-50"
            : "border-slate-300 hover:border-slate-400 hover:bg-slate-50/60",
        )}
      >
        <div className="flex flex-col items-center gap-3 text-slate-400">
          {compressing ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-medium text-slate-600">
                {t("vendor.wpCompressing")}
              </p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8" />
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {t("vendor.wpDragDrop")}{" "}
                  <span className="text-slate-900 underline underline-offset-2">
                    {t("vendor.wpClickBrowse")}
                  </span>
                </p>
                <p className="text-xs mt-1">{t("vendor.wpFileTypes")}</p>
              </div>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
          }}
        />
      </div>

      {/* Preview grid â€” existing URLs first, then new files */}
      {totalCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {/* Saved images */}
          {existingUrls.map((url, idx) => (
            <div
              key={`existing-${idx}`}
              className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100"
            >
              <Image
                src={url}
                alt={`Saved image ${idx + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              {idx === 0 && files.length === 0 && (
                <span className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-slate-900 text-white px-1.5 py-0.5 rounded">
                  {t("vendor.wpMainLabel")}
                </span>
              )}
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveExisting(url);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          {/* New files */}
          {files.map((file, idx) => {
            const url = URL.createObjectURL(file);
            const isMain = existingUrls.length === 0 && idx === 0;
            return (
              <div
                key={`new-${idx}`}
                className="relative group rounded-xl overflow-hidden border border-blue-300 aspect-square bg-slate-100"
              >
                <Image
                  src={url}
                  alt={file.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {isMain && (
                  <span className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-slate-900 text-white px-1.5 py-0.5 rounded">
                    {t("vendor.wpMainLabel")}
                  </span>
                )}
                <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                  {t("vendor.wpNewLabel")}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state when no files */}
      {totalCount === 0 && (
        <div className="text-center text-slate-400 text-xs">
          <ImageIcon className="h-5 w-5 mx-auto mb-1 opacity-40" />
          {t("vendor.wpNoImages")}
        </div>
      )}
    </div>
  );
}
