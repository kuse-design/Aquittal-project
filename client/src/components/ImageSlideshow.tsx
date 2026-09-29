import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Slide = {
  src: string;
  alt: string;
};

type ImageSlideshowProps = {
  slides: Slide[];
  intervalMs?: number;
  className?: string;
  tone?: "light" | "dark";
  showDots?: boolean;
  eager?: boolean;
  label?: string;
  children?: ReactNode;
};

/**
 * Crossfades through a set of images inside a fixed-size frame.
 *
 * The autoplay timer stops while the frame is scrolled out of view or the tab is
 * hidden, and never starts at all when the visitor asks for reduced motion.
 */
export function ImageSlideshow({
  slides,
  intervalMs = 5200,
  className,
  tone = "light",
  showDots = true,
  eager = false,
  label,
  children,
}: ImageSlideshowProps) {
  const [index, setIndex] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const inViewRef = useRef(true);

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: number | undefined;

    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };

    const start = () => {
      stop();
      timer = window.setInterval(() => {
        setIndex(current => (current + 1) % slides.length);
      }, intervalMs);
    };

    const sync = () => {
      if (document.hidden || !inViewRef.current) {
        stop();
      } else {
        start();
      }
    };

    const observer = new IntersectionObserver(
      entries => {
        inViewRef.current = entries.some(entry => entry.isIntersecting);
        sync();
      },
      { threshold: 0.15 },
    );
    if (frameRef.current) observer.observe(frameRef.current);

    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [slides.length, intervalMs]);

  return (
    <div ref={frameRef} className={cn("image-slides", className)} role="group" aria-label={label}>
      {slides.map((slide, position) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          data-active={position === index}
          aria-hidden={position === index ? undefined : true}
          loading={eager && position === 0 ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager && position === 0 ? "high" : undefined}
        />
      ))}

      {children}

      {showDots && slides.length > 1 && (
        <div className={cn("image-slides-dots", `image-slides-dots--${tone}`)}>
          {slides.map((slide, position) => (
            <button
              key={slide.src}
              type="button"
              aria-current={position === index}
              aria-label={`Show image ${position + 1} of ${slides.length}`}
              onClick={() => setIndex(position)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
