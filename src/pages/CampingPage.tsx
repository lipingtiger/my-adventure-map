import { currentJourney } from "../data/journeys";

export function CampingPage() {
  const campingOptions = currentJourney.lodging.filter((lodging) => lodging.type === "campground");

  return (
    <main className="standard-page">
      <div className="page-shell page-shell--standard placeholder-page">
        <span className="section-kicker">Camping</span>
        <h1>Camping and Lodging</h1>
        <p>{campingOptions.length} campground options are stored for the current journey.</p>
      </div>
    </main>
  );
}
