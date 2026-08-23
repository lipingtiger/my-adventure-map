import { ChevronLeft, ChevronRight, ExternalLink, Play, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { journeys } from "../data/journeys";
import { useJourneyStopOverrides } from "../hooks/useJourneyStopOverrides";
import { UploadedPhoto, useUploadedPhotos } from "../hooks/useUploadedPhotos";
import { UploadedVideo, useUploadedVideos } from "../hooks/useUploadedVideos";
import { formatDisplayDate, getStopDayLabel, sortStops } from "../utils/journey";

const ALL_STOPS = "all";

function sortPhotosByJourneyDate(photos: UploadedPhoto[]) {
  return [...photos].sort((firstPhoto, secondPhoto) =>
    (firstPhoto.takenAt ?? firstPhoto.createdAt).localeCompare(secondPhoto.takenAt ?? secondPhoto.createdAt),
  );
}

function sortVideosByJourneyDate(videos: UploadedVideo[]) {
  return [...videos].sort((firstVideo, secondVideo) =>
    (firstVideo.takenAt ?? firstVideo.createdAt).localeCompare(secondVideo.takenAt ?? secondVideo.createdAt),
  );
}

export function GalleryPage() {
  const [selectedJourneyId, setSelectedJourneyId] = useState(journeys[0]?.id ?? "");
  const [selectedStopId, setSelectedStopId] = useState(ALL_STOPS);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const baseJourney = journeys.find((journey) => journey.id === selectedJourneyId) ?? journeys[0];
  const { errorMessage: journeyError, isLoading: isLoadingJourney, journey } = useJourneyStopOverrides(baseJourney);
  const { errorMessage: photoError, isLoading: isLoadingPhotos, photos } = useUploadedPhotos(journey.id);
  const { errorMessage: videoError, isLoading: isLoadingVideos, videos } = useUploadedVideos(journey.id);
  const orderedStops = useMemo(() => sortStops(journey.stops), [journey.stops]);
  const visiblePhotos = useMemo(
    () =>
      sortPhotosByJourneyDate(
        selectedStopId === ALL_STOPS ? photos : photos.filter((photo) => photo.stopId === selectedStopId),
      ),
    [photos, selectedStopId],
  );
  const activePhotoIndex = visiblePhotos.findIndex((photo) => photo.id === activePhotoId);
  const activePhoto = activePhotoIndex >= 0 ? visiblePhotos[activePhotoIndex] : null;
  const visibleVideos = useMemo(
    () =>
      sortVideosByJourneyDate(
        selectedStopId === ALL_STOPS ? videos : videos.filter((video) => video.stopId === selectedStopId),
      ),
    [selectedStopId, videos],
  );
  const mediaGroups = useMemo(() => {
    const groups = orderedStops
      .map((stop) => ({
        id: stop.id,
        label: `${getStopDayLabel(stop)} — ${stop.name}`,
        photos: visiblePhotos.filter((photo) => photo.stopId === stop.id),
        videos: visibleVideos.filter((video) => video.stopId === stop.id),
      }))
      .filter((group) => group.photos.length > 0 || group.videos.length > 0);
    const unassignedPhotos = visiblePhotos.filter(
      (photo) => !photo.stopId || !orderedStops.some((stop) => stop.id === photo.stopId),
    );
    const unassignedVideos = visibleVideos.filter(
      (video) => !video.stopId || !orderedStops.some((stop) => stop.id === video.stopId),
    );

    return unassignedPhotos.length > 0 || unassignedVideos.length > 0
      ? [...groups, { id: "unassigned", label: "Other media", photos: unassignedPhotos, videos: unassignedVideos }]
      : groups;
  }, [orderedStops, visiblePhotos, visibleVideos]);

  useEffect(() => {
    setSelectedStopId(ALL_STOPS);
    setActivePhotoId(null);
  }, [selectedJourneyId]);

  useEffect(() => {
    if (!activePhoto) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActivePhotoId(null);
      }

      if (event.key === "ArrowLeft" && visiblePhotos.length > 1) {
        setActivePhotoId(visiblePhotos[(activePhotoIndex - 1 + visiblePhotos.length) % visiblePhotos.length].id);
      }

      if (event.key === "ArrowRight" && visiblePhotos.length > 1) {
        setActivePhotoId(visiblePhotos[(activePhotoIndex + 1) % visiblePhotos.length].id);
      }
    };

    document.body.classList.add("gallery-lightbox-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("gallery-lightbox-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePhoto, activePhotoIndex, visiblePhotos]);

  if (!baseJourney) {
    return null;
  }

  const isLoading = isLoadingJourney || isLoadingPhotos || isLoadingVideos;
  const errorMessage = journeyError || photoError || videoError;

  return (
    <main className="standard-page">
      <div className="page-shell page-shell--standard">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Gallery</span>
            <h1>Journey Photos &amp; Videos</h1>
          </div>
        </div>

        <div className="gallery-filters" aria-label="Gallery filters">
          <div className="gallery-journey-tabs" aria-label="Choose a journey">
            {journeys.map((journeyOption) => (
              <button
                aria-pressed={journeyOption.id === journey.id}
                key={journeyOption.id}
                onClick={() => setSelectedJourneyId(journeyOption.id)}
                type="button"
              >
                {journeyOption.title}
              </button>
            ))}
          </div>
          <label className="gallery-stop-filter">
            Stop
            <select onChange={(event) => setSelectedStopId(event.target.value)} value={selectedStopId}>
              <option value={ALL_STOPS}>All stops</option>
              {orderedStops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {getStopDayLabel(stop)} — {stop.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? <p className="gallery-status">Loading latest journey media...</p> : null}
        {errorMessage ? <p className="gallery-status gallery-status--error">{errorMessage}</p> : null}

        {!isLoading && !errorMessage && mediaGroups.length > 0 ? (
          <div className="gallery-stop-groups">
            {mediaGroups.map((group) => (
              <section className="gallery-stop-group" key={group.id} aria-labelledby={`gallery-stop-${group.id}`}>
                <div className="gallery-stop-group__heading">
                  <h2 id={`gallery-stop-${group.id}`}>{group.label}</h2>
                  <span>
                    {group.photos.length} photo{group.photos.length === 1 ? "" : "s"} · {group.videos.length} video
                    {group.videos.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="gallery-grid">
                  {group.photos.map((photo) => (
                    <button
                      className="gallery-card"
                      key={photo.id}
                      onClick={() => setActivePhotoId(photo.id)}
                      type="button"
                    >
                      <img alt={photo.title} loading="lazy" src={photo.publicUrl} />
                      <span className="gallery-card__body">
                        <strong>{photo.title}</strong>
                        {photo.takenAt ? <span className="gallery-card__date">{formatDisplayDate(photo.takenAt)}</span> : null}
                        {photo.caption ? <span>{photo.caption}</span> : null}
                      </span>
                    </button>
                  ))}
                  {group.videos.map((video) => (
                    <a className="gallery-card gallery-card--video" href={video.videoUrl} key={video.id} rel="noreferrer" target="_blank">
                      <span className="gallery-video-thumbnail">
                        {video.thumbnailUrl ? (
                          <img alt="" loading="lazy" src={video.thumbnailUrl} />
                        ) : (
                          <span className="gallery-video-thumbnail__fallback">YouTube video</span>
                        )}
                        <span className="gallery-video-play" aria-hidden="true">
                          <Play fill="currentColor" size={28} />
                        </span>
                      </span>
                      <span className="gallery-card__body">
                        <strong>{video.title}</strong>
                        {video.takenAt ? <span className="gallery-card__date">{formatDisplayDate(video.takenAt)}</span> : null}
                        {video.caption ? <span>{video.caption}</span> : null}
                        <span className="gallery-video-link">Watch video <ExternalLink aria-hidden="true" size={15} /></span>
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : !isLoading && !errorMessage ? (
          <div className="gallery-empty">
            <h2>No uploaded media here yet</h2>
            <p>Choose another stop, or use the Admin page to add photos and video links.</p>
          </div>
        ) : null}
      </div>

      {activePhoto ? (
        <div className="gallery-lightbox" onClick={() => setActivePhotoId(null)} role="presentation">
          <div
            aria-label={`${activePhoto.title} full-size photo`}
            aria-modal="true"
            className="gallery-lightbox__dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button className="gallery-lightbox__close" onClick={() => setActivePhotoId(null)} type="button">
              <X aria-hidden="true" size={22} />
              <span className="sr-only">Close full-size photo</span>
            </button>
            <img alt={activePhoto.title} src={activePhoto.publicUrl} />
            <div className="gallery-lightbox__details">
              <div>
                <strong>{activePhoto.title}</strong>
                {activePhoto.caption ? <p>{activePhoto.caption}</p> : null}
              </div>
              <a href={activePhoto.publicUrl} rel="noreferrer" target="_blank">
                <ExternalLink aria-hidden="true" size={17} />
                Open original
              </a>
            </div>
            {visiblePhotos.length > 1 ? (
              <>
                <button
                  aria-label="Previous photo"
                  className="gallery-lightbox__nav gallery-lightbox__nav--previous"
                  onClick={() =>
                    setActivePhotoId(
                      visiblePhotos[(activePhotoIndex - 1 + visiblePhotos.length) % visiblePhotos.length].id,
                    )
                  }
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" size={28} />
                </button>
                <button
                  aria-label="Next photo"
                  className="gallery-lightbox__nav gallery-lightbox__nav--next"
                  onClick={() => setActivePhotoId(visiblePhotos[(activePhotoIndex + 1) % visiblePhotos.length].id)}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" size={28} />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
