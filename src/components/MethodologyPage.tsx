import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import methodologyContent from "../../METHODOLOGY.md?raw";
import { markdownComponents } from "./MarkdownRenderer";

export default function MethodologyPage() {
  return (
    <div className="animate-fade-in" id="methodology-page">
      <div
        className="bg-white dark:bg-[#15181E] border border-[#E5E1DA] dark:border-[#2C323E] rounded-none p-6 md:p-10 shadow-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        id="methodology-content-card"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {methodologyContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
