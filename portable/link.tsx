import type { AnchorHTMLAttributes } from "react";
export default function Link({
  href = "",
  target,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const internal = href.startsWith("/");
  return (
    <a
      {...props}
      href={internal ? `#${href}` : href}
      target={internal ? undefined : target}
      onClick={(event) => {
        onClick?.(event);
        if (internal && !event.defaultPrevented) {
          event.preventDefault();
          // srcdoc viewers resolve hash links against their parent document. Navigate
          // within React instead so the portable site also works in opaque iframes.
          window.dispatchEvent(
            new CustomEvent("toc:navigate", { detail: href }),
          );
        }
      }}
    />
  );
}
