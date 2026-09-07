import { Link } from "react-router-dom";
import { useJourneys } from "../hooks/useJourneys";
import { formatDateRange } from "../utils/journey";

export function JourneysPage() {
  const { journeys, isLoading, errorMessage, refresh } = useJourneys();
  return <main className="standard-page"><div className="page-shell page-shell--standard">
    <h1>Journeys</h1>
    {isLoading && <p>Loading journeys...</p>}
    {errorMessage && <p role="alert">{errorMessage} <button onClick={refresh}>Retry</button></p>}
    {!isLoading && !errorMessage && !journeys.length && <p>No journeys yet.</p>}
    <div className="journey-list">{journeys.map((journey) => <Link className="journey-list-item" to={`/journeys/${journey.slug}`} key={journey.id}>
      <div><h2>{journey.title}</h2><p>{journey.subtitle}</p><span>{formatDateRange(journey.startDate, journey.endDate)}</span></div>
      <div><span className="journey-card__status">{journey.status}</span><p>{journey.stops.length} stops</p></div>
    </Link>)}</div>
  </div></main>;
}
