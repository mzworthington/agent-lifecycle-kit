import { EvalDemo } from './EvalDemo';
import { HomeCtas } from './HomeCtas';
import { OntologyExplorer } from './OntologyExplorer';
import { TodayJobs } from './TodayJobs';

type Props = {
  name: string;
};

export function DocsWidget({ name }: Props) {
  if (name === 'today-jobs') return <TodayJobs />;
  if (name === 'demo') return <EvalDemo />;
  if (name === 'ontology') return <OntologyExplorer />;
  if (name === 'ctas') return <HomeCtas />;
  return null;
}
