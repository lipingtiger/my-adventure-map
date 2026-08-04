import { currentJourney } from "../data/journeys";

export function GalleryPage() {
  return (
    <main className="standard-page">
      <div className="page-shell page-shell--standard placeholder-page">
        <span className="section-kicker">Gallery</span>
        <h1>Photos and Videos</h1>
        <p>{currentJourney.photos.length + currentJourney.videos.length} media placeholders are ready for future trip uploads.</p>
      </div>
    </main>
  );
}
