import { photoFilters } from "../data/story";
import type { usePhotoEditor } from "../hooks/usePhotoEditor";

type PhotoPanelProps = {
  /** The whole usePhotoEditor result — this panel is its only consumer. */
  photo: ReturnType<typeof usePhotoEditor>;
};

export function PhotoPanel({ photo }: PhotoPanelProps) {
  const {
    photoData, photoName, photoFilter, photoBrightness, photoContrast, photoSaturation,
    photoZoom, photoError, photoFilterStyle, cameraInputRef, uploadInputRef,
    setPhotoFilter, setPhotoBrightness, setPhotoContrast, setPhotoSaturation, setPhotoZoom,
    handlePhotoFile, removePhoto,
  } = photo;

  return (
    <section className="photo-studio diy-panel" aria-labelledby="photo-studio-title">
      <div className="diy-panel-heading"><div><strong id="photo-studio-title">Add & edit a photo</strong><small>Camera, upload, filters and adjustments.</small></div><span className="device-pill">DEVICE-ONLY</span></div>
      <input ref={cameraInputRef} className="photo-file-input" type="file" accept="image/*" capture="environment" onChange={(event) => handlePhotoFile(event.target.files?.[0])} />
      <input ref={uploadInputRef} className="photo-file-input" type="file" accept="image/*" onChange={(event) => handlePhotoFile(event.target.files?.[0])} />
      {!photoData ? (
        <div className="photo-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handlePhotoFile(event.dataTransfer.files?.[0]); }}>
          <span className="photo-drop-icon">◎</span>
          <div><strong>Add the moment behind the story</strong><small>Take a new photo or choose one from your device.</small></div>
          <div className="photo-source-actions"><button type="button" onClick={() => cameraInputRef.current?.click()}>◉ Camera</button><button type="button" onClick={() => uploadInputRef.current?.click()}>↑ Upload</button></div>
        </div>
      ) : (
        <div className="photo-editor">
          <div className="photo-editor-thumb"><img src={photoData} alt="Selected story moment" style={{ filter: photoFilterStyle, transform: `scale(${photoZoom})` }} /><button type="button" onClick={removePhoto} aria-label="Remove photo">×</button><span>{photoName}</span></div>
          <div className="photo-filter-list" aria-label="Photo filters">
            {photoFilters.map((entry) => <button type="button" key={entry.id} className={photoFilter === entry.id ? "active" : ""} aria-pressed={photoFilter === entry.id} onClick={() => setPhotoFilter(entry.id)}><i style={{ backgroundImage: `url(${photoData})`, filter: `${entry.css} brightness(${photoBrightness}%) contrast(${photoContrast}%) saturate(${photoSaturation}%)` }} /><span>{entry.label}</span></button>)}
          </div>
          <div className="photo-adjustments">
            <label><span>Brightness <b>{photoBrightness}</b></span><input type="range" min="70" max="130" value={photoBrightness} onChange={(event) => setPhotoBrightness(Number(event.target.value))} /></label>
            <label><span>Contrast <b>{photoContrast}</b></span><input type="range" min="70" max="140" value={photoContrast} onChange={(event) => setPhotoContrast(Number(event.target.value))} /></label>
            <label><span>Color <b>{photoSaturation}</b></span><input type="range" min="0" max="160" value={photoSaturation} onChange={(event) => setPhotoSaturation(Number(event.target.value))} /></label>
            <label><span>Zoom <b>{photoZoom.toFixed(1)}×</b></span><input type="range" min="1" max="1.8" step="0.1" value={photoZoom} onChange={(event) => setPhotoZoom(Number(event.target.value))} /></label>
          </div>
          <div className="photo-replace-actions"><button type="button" onClick={() => cameraInputRef.current?.click()}>Retake</button><button type="button" onClick={() => uploadInputRef.current?.click()}>Replace photo</button></div>
        </div>
      )}
      {photoError && <p className="photo-error" role="alert">{photoError}</p>}
    </section>
  );
}
