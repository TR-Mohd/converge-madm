import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [headerHeight, setHeaderHeight] = useState(81);

  // Track actual header height, re-measure on resize
  useEffect(() => {
    const measure = () => {
      const header = document.getElementById("app-header");
      if (header) {
        // getBoundingClientRect().bottom gives the exact sub-pixel position of
        // the header's bottom edge in the viewport. offsetHeight rounds to an
        // integer, which causes a hairline gap on mobile HiDPI screens
        // (e.g. devicePixelRatio=3: 80.333px header → offsetHeight=80 → 0.333px gap).
        setHeaderHeight(header.getBoundingClientRect().bottom);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    const header = document.getElementById("app-header");
    if (header) ro.observe(header);
    return () => ro.disconnect();
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

  const stickyBar = (
    <div
      style={{
        position: "fixed",
        top: headerHeight,
        left: 0,
        right: 0,
        zIndex: 40,
        opacity: showStickyBar ? 1 : 0,
        transform: showStickyBar ? "translateY(0)" : "translateY(-6px)",
        pointerEvents: showStickyBar ? "auto" : "none",
        transition: "opacity 180ms ease, transform 180ms ease",
      }}
      className="bg-white dark:bg-[#15181E] border-b border-[#E5E1DA] dark:border-[#262A33]"
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
  );

  return (
    <div className="space-y-6 animate-fade-in" id="doc-page-layout">
      {/* Sticky sub-header portaled to body so it spans full viewport width */}
      {typeof document !== "undefined" && createPortal(stickyBar, document.body)}

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

      {/* Page content */}
      {children}
    </div>
  );
}
