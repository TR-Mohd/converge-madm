import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import limitationsContent from "../../LIMITATIONS.md?raw";
import { markdownComponents } from "./MarkdownRenderer";

export default function LimitationsPage() {
  const sections = limitationsContent
    .split(/(?:\r?\n)+---(?:\r?\n)+/)
    .map((section) => section.trim())
    .filter(Boolean);

  const introSection = sections[0] || "";
  const numberedSections = sections.slice(1, 6);
  const summarySection = sections[6] || "";

  return (
    <div className="space-y-8 animate-fade-in" id="limitations-page">
      {/* Intro section */}
      <div
        className="bg-white dark:bg-[#15181E] border border-[#E5E1DA] dark:border-[#2C323E] rounded-none p-6 md:p-10 shadow-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        id="limitations-intro-card"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {introSection}
        </ReactMarkdown>
      </div>

      {/* 5 Numbered Sections with consistent accent callout treatment */}
      <div className="space-y-6" id="limitations-numbered-sections">
        {numberedSections.map((content, idx) => (
          <div
            key={idx}
            className="p-6 md:p-8 rounded-none border border-[#E5E1DA] dark:border-[#2C323E] bg-[#FBF9F7]/80 dark:bg-[#1A1E27]/80 border-l-4 border-l-[#121212] dark:border-l-[#FE9A00] shadow-2xs transition-colors [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            id={`limitations-section-${idx + 1}`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
          </div>
        ))}
      </div>

      {/* Summary section */}
      {summarySection && (
        <div
          className="bg-white dark:bg-[#15181E] border border-[#E5E1DA] dark:border-[#2C323E] rounded-none p-6 md:p-10 shadow-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          id="limitations-summary-card"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {summarySection}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
