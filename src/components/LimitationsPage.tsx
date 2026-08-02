import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import limitationsContent from "../../LIMITATIONS.md?raw";
import { markdownComponents } from "./MarkdownRenderer";
import DocPageLayout from "./DocPageLayout";

// Full intro paragraph from LIMITATIONS.md (sections[0] minus the h1 line)
const FULL_DESC =
  "Converge is built on well-established multi-criteria decision analysis methods (AHP and TOPSIS). Like any implementation of these methods, it inherits some known theoretical properties and makes some deliberate engineering trade-offs. This document states them plainly, rather than letting them surface as surprises.";

const SHORT_DESC =
  "Known theoretical properties and deliberate trade-offs, disclosed plainly.";

const sections = limitationsContent
  .split(/(?:\r?\n)+---(?:\r?\n)+/)
  .map((section) => section.trim())
  .filter(Boolean);

// sections[0] = intro (h1 + para) → absorbed into DocPageLayout hero
// sections[1..5] = 5 numbered limitation sections
// sections[6] = summary
const numberedSections = sections.slice(1, 6);
const summarySection = sections[6] || "";

export default function LimitationsPage() {
  return (
    <DocPageLayout
      title="Known Limitations"
      shortDesc={SHORT_DESC}
      fullDesc={FULL_DESC}
    >
      {/* 5 Numbered Sections — consistent orange/monochrome left-border accent callouts */}
      <div className="space-y-6" id="limitations-numbered-sections">
        {numberedSections.map((content, idx) => (
          <div
            key={idx}
            className="p-6 md:p-8 rounded-none border border-[#E5E1DA] dark:border-[#2C323E] bg-[#FBF9F7]/80 dark:bg-[#1A1E27]/80 border-l-4 border-l-[#121212] dark:border-l-[#FE9A00] shadow-2xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            id={`limitations-section-${idx + 1}`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {summarySection}
          </ReactMarkdown>
        </div>
      )}
    </DocPageLayout>
  );
}
