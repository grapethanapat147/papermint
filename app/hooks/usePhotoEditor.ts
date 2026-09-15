import { useRef, useState } from "react";

import { photoFilters } from "../data/story";
import type { PhotoFilter } from "../types";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

/**
 * Owns the photo the user attaches to a receipt, plus its adjustments.
 *
 * The image never leaves the device: it is held as a local data URL and is
 * deliberately absent from the shared `#s=` payload. Do not add it to a URL,
 * analytics, or remote storage without a privacy and persistence design.
 */
export function usePhotoEditor() {
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>("original");
  const [photoBrightness, setPhotoBrightness] = useState(100);
  const [photoContrast, setPhotoContrast] = useState(100);
  const [photoSaturation, setPhotoSaturation] = useState(100);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoError, setPhotoError] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const activePhotoFilter = photoFilters.find((entry) => entry.id === photoFilter)?.css ?? "";
  const photoFilterStyle = `${activePhotoFilter} brightness(${photoBrightness}%) contrast(${photoContrast}%) saturate(${photoSaturation}%)`.trim();

  function handlePhotoFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoError("Please choose an image file."); return; }
    if (file.size > MAX_PHOTO_BYTES) { setPhotoError("Please choose an image smaller than 15 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoData(String(reader.result)); setPhotoName(file.name || "Camera photo"); setPhotoError("");
      setPhotoFilter("original"); setPhotoBrightness(100); setPhotoContrast(100); setPhotoSaturation(100); setPhotoZoom(1);
    };
    reader.onerror = () => setPhotoError("That photo could not be opened. Please try another one.");
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhotoData(null); setPhotoName(""); setPhotoError("");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  return {
    photoData, photoName, photoFilter, photoBrightness, photoContrast, photoSaturation,
    photoZoom, photoError, photoFilterStyle, cameraInputRef, uploadInputRef,
    setPhotoFilter, setPhotoBrightness, setPhotoContrast, setPhotoSaturation, setPhotoZoom, setPhotoError,
    handlePhotoFile, removePhoto,
  };
}
