import { EvalDemo } from '../components/EvalDemo';
import { HomeHero } from '../components/HomeHero';
import { HomeNext } from '../components/HomeNext';
import { HomeProof } from '../components/HomeProof';
import { TodayJobs } from '../components/TodayJobs';

export function HomeLanding() {
  return (
    <div className="landing-page">
      <HomeHero />
      <TodayJobs showHeading />
      <HomeProof />
      <EvalDemo />
      <HomeNext />
    </div>
  );
}
