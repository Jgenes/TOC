import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export default function NotFound() {
  return (
    <div className="not-found">
      <div>
        <h1>404</h1>
        <h2>A little off the guest list.</h2>
        <p>
          We couldn’t find that page. Let’s get you back to something worth
          planning.
        </p>
        <Link className="button button-primary" href="/">
          Back to the homepage
          <ArrowUpRight size={17} />
        </Link>
      </div>
    </div>
  );
}
