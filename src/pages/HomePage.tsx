import { HeroBanner } from "../components/HeroBanner";
import { InteractiveMapPlaceholder } from "../components/InteractiveMapPlaceholder";
import { JourneyOverview } from "../components/JourneyOverview";

export function HomePage() {
  return (
    <main>
      <HeroBanner />
      <div className="page-shell">
        <InteractiveMapPlaceholder />
        <JourneyOverview />
      </div>
    </main>
  );
}
