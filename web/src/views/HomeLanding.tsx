import { EvalDemo } from '../components/EvalDemo';
import { HomeCli } from '../components/HomeCli';
import { HomeHero } from '../components/HomeHero';
import { HomeNext } from '../components/HomeNext';
import { HomeProof } from '../components/HomeProof';
import { HomeUsedIn } from '../components/HomeUsedIn';
import { TodayJobs } from '../components/TodayJobs';

export function HomeLanding() {
  return (
    <div className="landing-page">
      <HomeHero />
      <TodayJobs showHeading />
      <HomeCli />
      <HomeUsedIn />
      <HomeProof />
      <EvalDemo />
      <HomeNext />
    </div>
  );
}
