import React, { useRef, useState, useEffect } from "react";

interface ScrollableTableWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export default function ScrollableTableWrapper({
  children,
  className = "",
  id,
}: ScrollableTableWrapperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRightHint, setShowRightHint] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // 2px tolerance for subpixel / border rendering
    const hasMoreRight = el.scrollWidth - el.scrollLeft - el.clientWidth > 2;
    setShowRightHint(hasMoreRight);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      checkScroll();
    });
    observer.observe(el);
    if (el.firstElementChild) {
      observer.observe(el.firstElementChild);
    }
    return () => observer.disconnect();
  }, [children]);

  return (
    <div className="relative overflow-hidden w-full" id={id}>
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={`overflow-x-auto ${className}`}
      >
        {children}
      </div>

      {/* Persistent soft right-edge gradient/shadow hint when content overflows */}
      <div
        className={`absolute top-0 right-0 bottom-0 w-8 sm:w-12 pointer-events-none z-10 transition-opacity duration-300 bg-gradient-to-l from-neutral-400/80 sm:from-neutral-300/70 via-neutral-200/40 to-transparent dark:from-black/90 sm:dark:from-black/80 dark:via-black/40 dark:to-transparent ${
          showRightHint ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
        id={`${id || "table"}-scroll-hint`}
      />
    </div>
  );
}
