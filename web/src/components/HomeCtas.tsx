import { Link } from 'wouter';

export function HomeCtas() {
  return (
    <ul className="home-ctas">
      <li>
        <Link href="/docs/start" className="btn-cta btn-cta-primary">
          Install kit
        </Link>
      </li>
      <li>
        <Link href="/docs/edd" className="btn-cta btn-cta-ghost">
          Read the EDD guide
        </Link>
      </li>
      <li>
        <Link href="/docs/map" className="btn-cta btn-cta-ghost">
          Open the kit map
        </Link>
      </li>
    </ul>
  );
}
