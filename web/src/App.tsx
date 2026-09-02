import { Route, Switch, useLocation } from 'wouter';
import { DocsPage } from './pages/DocsPage';
import { HomePage } from './pages/HomePage';
import { usePageSeo } from './seo/usePageSeo.ts';

export function App() {
  const [location] = useLocation();
  usePageSeo(location);

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/docs/*" component={DocsPage} />
      <Route path="/SOPs/:slug" component={DocsPage} />
      <Route path="/evals/*" component={DocsPage} />
      <Route path="/mcps" component={DocsPage} />
      <Route path="/mcps/*" component={DocsPage} />
      <Route path="/ontology" component={DocsPage} />
      <Route path="/ontology/*" component={DocsPage} />
      <Route>
        <DocsPage />
      </Route>
    </Switch>
  );
}
