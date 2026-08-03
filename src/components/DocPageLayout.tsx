import React, { useEffect, useRef, useState } from "react";

interface DocPageLayoutProps {
  title: string;
  shortDesc: string;
  fullDesc: string;
  children: React.ReactNode;
}

export default function DocPageLayout({
  title,
  shortDesc,
  fullDesc,
  children,
}: DocPageLayoutProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Set actual header height directly on document.documentElement via CSS variable
  // to avoid React state re-renders during active scrolling, preventing frame lag.
  useEffect(() => {
    const measure = () => {
      const header = document.getElementById("app-header");
      if (header) {
        const bottom = header.getBoundingClientRect().bottom;
        document.documentElement.style.setProperty(
          "--header-height",
          `${bottom}px`
        );
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    const header = document.getElementById("app-header");
    if (header) ro.observe(header);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--header-height");
    };
  }, []);

  // IntersectionObserver: show sticky bar when hero scrolls out of view
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // Reset sticky bar when component unmounts (route change)
  useEffect(() => {
    return () => setShowStickyBar(false);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in" id="doc-page-layout">
      {/* Hero block — watched by IntersectionObserver */}
      <div
        ref={heroRef}
        className="bg-white dark:bg-[#15181E] border border-[#E5E1DA] dark:border-[#2C323E] rounded-none p-6 md:p-10 shadow-xs"
        id="doc-hero-block"
      >
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif italic font-bold text-[#121212] dark:text-white tracking-tight mb-3">
          {title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-[#9CA3AF] font-sans leading-relaxed">
          {fullDesc}
        </p>
      </div>

      {/* Sticky sub-header: native position:sticky within page DOM flow, using negative bottom margin so it doesn't displace content when hidden at top */}
      <div
        style={{
          position: "sticky",
          top: "var(--header-height, 81px)",
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          marginBottom: "-49px",
          zIndex: 40,
          opacity: showStickyBar ? 1 : 0,
          transform: showStickyBar ? "translateY(0)" : "translateY(-6px)",
          pointerEvents: showStickyBar ? "auto" : "none",
          transition: "opacity 180ms ease, transform 180ms ease",
        }}
        className="bg-white dark:bg-[#15181E] border-b border-[#E5E1DA] dark:border-[#262A33] !my-0"
        id="doc-sticky-subheader"
        aria-hidden={!showStickyBar}
      >
        <div className="max-w-4xl mx-auto px-4 max-[499px]:py-2.5 min-[500px]:py-3 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
          <span className="font-serif italic font-bold text-sm text-[#121212] dark:text-white shrink-0 leading-snug">
            {title}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-[#6B7280] leading-snug">
            {shortDesc}
          </span>
        </div>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
