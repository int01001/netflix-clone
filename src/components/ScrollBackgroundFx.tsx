"use client";

import { useEffect } from "react";

export default function ScrollBackgroundFx() {
  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const y = window.scrollY || window.pageYOffset || 0;
      const max = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const progress = Math.min(1, Math.max(0, y / max));

      document.documentElement.style.setProperty("--scroll-y", y.toFixed(2));
      document.documentElement.style.setProperty(
        "--scroll-progress",
        progress.toFixed(4),
      );
    };

    const onScrollOrResize = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  return null;
}

