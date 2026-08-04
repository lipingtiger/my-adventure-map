import { currentJourney } from "../data/journeys";

export function HikingPage() {
  return (
    <main className="standard-page">
      <div className="page-shell page-shell--standard placeholder-page">
        <span className="section-kicker">Hiking</span>
        <h1>Trail Options</h1>
        <p>{currentJourney.hikes.length} hiking options are stored in the current journey data.</p>
      </div>
    </main>
  );
}
