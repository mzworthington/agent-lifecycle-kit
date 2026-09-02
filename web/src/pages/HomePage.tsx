import { DocsShell } from '../components/DocsShell';
import { EvalDemo } from '../components/EvalDemo';
import { HomeHero } from '../components/HomeHero';
import { HomeNext } from '../components/HomeNext';
import { HomeProof } from '../components/HomeProof';
import { TodayJobs } from '../components/TodayJobs';

export function HomePage() {
  return (
    <DocsShell layout="landing">
      <div className="landing-page">
        <HomeHero />
        <TodayJobs showHeading />
        <HomeProof />
        <EvalDemo />
        <HomeNext />
      </div>
    </DocsShell>
  );
}
