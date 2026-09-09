"use client";

import { useEffect } from "react";

/** Opens a native <details> when the URL hash matches its id (home About link, footer). */
export function OpenDetailsOnHash({ id }: { id: string }) {
  useEffect(() => {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLDetailsElement)) return;

    const openIfHash = () => {
      if (window.location.hash === `#${id}`) el.open = true;
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.hash !== `#${id}`) return;
      requestAnimationFrame(openIfHash);
    };

    openIfHash();
    window.addEventListener("hashchange", openIfHash);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", openIfHash);
      document.removeEventListener("click", onClick);
    };
  }, [id]);

  return null;
}
