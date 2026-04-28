"use client";

import { useState } from "react";
import { Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ImageGalleryProps {
  images: string[];
  alt: string;
}

export function ImageGallery({ images, alt }: ImageGalleryProps) {
  const [active, setActive] = useState(0);

  if (!images || images.length === 0) {
    return (
      <Card className="mb-4">
        <CardContent className="h-96 flex items-center justify-center p-0 rounded-xl overflow-hidden">
          <div className="flex flex-col items-center gap-3 text-muted-foreground/30">
            <Wrench className="w-16 h-16" />
            <span className="text-sm">No image</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4">
        <CardContent className="h-96 flex items-center justify-center p-0 rounded-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[active]}
            alt={`${alt} – image ${active + 1}`}
            className="object-contain h-full w-full"
          />
        </CardContent>
      </Card>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.slice(0, 8).map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-20 rounded-xl border-2 overflow-hidden transition-colors focus:outline-none ${
                i === active
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-slate-400"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${alt} thumbnail ${i + 1}`}
                className="object-cover h-full w-full"
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
