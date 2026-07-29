import React, { useRef, useState, useEffect } from "react";

interface ScrollableTableWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  mode?: "horizontal" | "vertical";
  bgVar?: string;
}

export default function ScrollableTableWrapper({
  children,
  className = "",
  id,
  mode = "horizontal",
  bgVar = "var(--bg-surface)",
}: ScrollableTableWrapperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showHint, setShowHint] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (mode === "horizontal") {
      // 2px tolerance for subpixel / border rendering
      const hasMoreRight = el.scrollWidth - el.scrollLeft - el.clientWidth > 2;
      setShowHint(hasMoreRight);
    } else {
      const hasMoreBottom = el.scrollHeight - el.scrollTop - el.clientHeight > 2;
      setShowHint(hasMoreBottom);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [mode]);

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
  }, [children, mode]);

  const isHorizontal = mode === "horizontal";

  return (
    <div className="relative overflow-hidden w-full" id={id}>
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={`${isHorizontal ? "overflow-x-auto" : "overflow-y-auto"} ${className}`}
      >
        {children}
      </div>

      {/* Persistent soft right-edge or bottom-edge gradient fade hint when content overflows */}
      <div
        className={`absolute pointer-events-none z-10 transition-opacity duration-300 ${
          isHorizontal
            ? "top-0 right-0 bottom-0 w-14 sm:w-16"
            : "left-0 right-0 bottom-0 h-14 sm:h-16"
        } ${showHint ? "opacity-100" : "opacity-0"}`}
        style={{
          background: isHorizontal
            ? `linear-gradient(to left, color-mix(in srgb, ${bgVar} 85%, transparent) 0%, color-mix(in srgb, ${bgVar} 45%, transparent) 45%, transparent 100%)`
            : `linear-gradient(to top, color-mix(in srgb, ${bgVar} 85%, transparent) 0%, color-mix(in srgb, ${bgVar} 45%, transparent) 45%, transparent 100%)`,
        }}
        aria-hidden="true"
        id={`${id || "scroll"}-hint`}
      />
    </div>
  );
}
