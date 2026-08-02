import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import methodologyContent from "../../METHODOLOGY.md?raw";
import { markdownComponents } from "./MarkdownRenderer";
import DocPageLayout from "./DocPageLayout";

// Strip the h1 + italic description lines; render everything from the first
// section separator onwards so there's a single source of truth (the .md file)
// and no duplicate h1 between the hero card and the markdown content.
const firstSepIdx = methodologyContent.indexOf("\n---\n");
const bodyContent =
  firstSepIdx >= 0
    ? methodologyContent.slice(firstSepIdx + 5).trim()
    : methodologyContent;

const FULL_DESC = "How Converge turns a plain-English decision into a ranked answer.";

export default function MethodologyPage() {
  return (
    <DocPageLayout
      title="Methodology"
      shortDesc={FULL_DESC}
      fullDesc={FULL_DESC}
    >
      <div
        className="bg-white dark:bg-[#15181E] border border-[#E5E1DA] dark:border-[#2C323E] rounded-none p-6 md:p-10 shadow-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        id="methodology-content-card"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {bodyContent}
        </ReactMarkdown>
      </div>
    </DocPageLayout>
  );
}
