import { currentJourney } from "../data/journeys";
import { useUploadedPhotos } from "../hooks/useUploadedPhotos";
import { formatDisplayDate } from "../utils/journey";

export function GalleryPage() {
  const { errorMessage, isLoading, photos } = useUploadedPhotos(currentJourney.id);

  return (
    <main className="standard-page">
      <div className="page-shell page-shell--standard">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Gallery</span>
            <h1>Photos and Videos</h1>
          </div>
        </div>

        {isLoading ? <p className="gallery-status">Loading uploaded photos...</p> : null}
        {errorMessage ? <p className="gallery-status gallery-status--error">{errorMessage}</p> : null}

        {photos.length > 0 ? (
          <div className="gallery-grid">
            {photos.map((photo) => (
              <article className="gallery-card" key={photo.id}>
                <img alt={photo.title} loading="lazy" src={photo.publicUrl} />
                <div className="gallery-card__body">
                  <h2>{photo.title}</h2>
                  {photo.takenAt ? <p className="gallery-card__date">{formatDisplayDate(photo.takenAt)}</p> : null}
                  {photo.caption ? <p>{photo.caption}</p> : null}
                </div>
              </article>
            ))}
          </div>
        ) : !isLoading ? (
          <div className="gallery-empty">
            <h2>No uploaded photos yet</h2>
            <p>Use the Admin page to upload photos during the journey.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
