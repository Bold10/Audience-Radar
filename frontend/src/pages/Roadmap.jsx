import { Link } from "react-router-dom";
import { Page } from "@/components/Layout";
import { RoadmapColumns } from "@/components/RoadmapColumns";

export default function Roadmap() {
  return (
    <Page testid="roadmap-page">
      <p className="eyebrow">Roadmap</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold sm:text-5xl">From sample data to a live radar.</h1>
      <p className="mt-4 max-w-2xl text-base text-soft md:text-lg">What works today, what ships next, and what comes later. Live data will only ever use official platform APIs, never scraping.</p>
      <div className="mt-12"><RoadmapColumns /></div>
      <Link to="/app" className="btn-primary mt-12" data-testid="roadmap-start-button">Try the demo run</Link>
    </Page>
  );
}
