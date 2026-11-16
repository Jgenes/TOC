"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="not-found">
      <div>
        <h2>A small interruption.</h2>
        <p>
          Something didn’t load as expected. Please try again. Your saved draft,
          if any, remains on this device.
        </p>
        <button className="button button-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
