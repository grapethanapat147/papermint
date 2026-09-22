import { useCallback, useRef, useState } from "react";

import { photoFilters } from "../data/story";
import type { PhotoFilter } from "../types";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_OFFSET_PERCENT = 40;

const clampOffset = (value: number) =>
  Math.round(Math.max(-MAX_OFFSET_PERCENT, Math.min(MAX_OFFSET_PERCENT, value)));

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
  /** Crop position, as a percentage of the drawn photo. 0/0 is centred. */
  const [photoOffsetX, setPhotoOffsetX] = useState(0);
  const [photoOffsetY, setPhotoOffsetY] = useState(0);
  const [photoError, setPhotoError] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const activePhotoFilter = photoFilters.find((entry) => entry.id === photoFilter)?.css ?? "";
  const photoFilterStyle = `${activePhotoFilter} brightness(${photoBrightness}%) contrast(${photoContrast}%) saturate(${photoSaturation}%)`.trim();
  /** Scale first, then shift, so the export can mirror it with one multiply. */
  const photoTransform = `scale(${photoZoom}) translate(${photoOffsetX}%, ${photoOffsetY}%)`;

  function handlePhotoFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoError("Please choose an image file."); return; }
    if (file.size > MAX_PHOTO_BYTES) { setPhotoError("Please choose an image smaller than 15 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoData(String(reader.result)); setPhotoName(file.name || "Camera photo"); setPhotoError("");
      setPhotoFilter("original"); setPhotoBrightness(100); setPhotoContrast(100); setPhotoSaturation(100); setPhotoZoom(1);
      setPhotoOffsetX(0); setPhotoOffsetY(0);
    };
    reader.onerror = () => setPhotoError("That photo could not be opened. Please try another one.");
    reader.readAsDataURL(file);
  }

  /** Clamped so the photo can never be dragged fully out of its frame. */
  function nudgePhotoOffset(dxPercent: number, dyPercent: number) {
    setPhotoOffsetX((current) => clampOffset(current + dxPercent));
    setPhotoOffsetY((current) => clampOffset(current + dyPercent));
  }

  /**
   * Puts a photo back from a device handoff. Stable, so a mount effect can
   * depend on it. Adjustments reset because they are not carried across.
   */
  const hydratePhoto = useCallback((dataUrl: string | null) => {
    setPhotoData(dataUrl);
    setPhotoName(dataUrl ? "Handed off photo" : "");
    setPhotoError("");
    setPhotoFilter("original"); setPhotoBrightness(100); setPhotoContrast(100); setPhotoSaturation(100);
    setPhotoZoom(1); setPhotoOffsetX(0); setPhotoOffsetY(0);
  }, []);

  function removePhoto() {
    setPhotoData(null); setPhotoName(""); setPhotoError("");
    setPhotoOffsetX(0); setPhotoOffsetY(0);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  return {
    photoData, photoName, photoFilter, photoBrightness, photoContrast, photoSaturation,
    photoZoom, photoError, photoFilterStyle, photoTransform, photoOffsetX, photoOffsetY,
    cameraInputRef, uploadInputRef,
    setPhotoFilter, setPhotoBrightness, setPhotoContrast, setPhotoSaturation, setPhotoZoom, setPhotoError,
    setPhotoOffsetX: (value: number) => setPhotoOffsetX(clampOffset(value)),
    setPhotoOffsetY: (value: number) => setPhotoOffsetY(clampOffset(value)),
    nudgePhotoOffset, handlePhotoFile, removePhoto, hydratePhoto,
  };
}
