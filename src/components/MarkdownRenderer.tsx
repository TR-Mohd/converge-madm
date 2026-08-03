import React from "react";
import { Link } from "react-router-dom";
import type { Components } from "react-markdown";
import ScrollableTableWrapper from "./ScrollableTableWrapper";

export const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1
      className="text-2xl sm:text-3xl md:text-4xl font-serif italic font-bold text-[#121212] dark:text-white mt-6 mb-4 tracking-tight"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="text-xl sm:text-2xl font-serif italic font-bold text-[#121212] dark:text-white mt-8 mb-4 border-b border-[#E5E1DA] dark:border-[#2C323E] pb-3 tracking-tight"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="text-xs sm:text-sm font-sans font-bold text-[#121212] dark:text-white mt-6 mb-2.5 tracking-widest uppercase"
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p
      className="text-xs sm:text-sm font-sans text-gray-600 dark:text-[#D1D5DB] leading-relaxed mb-4"
      {...props}
    >
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="list-disc list-inside space-y-2 mb-4 text-xs sm:text-sm text-gray-600 dark:text-[#D1D5DB] font-sans"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="list-decimal list-inside space-y-2 mb-4 text-xs sm:text-sm text-gray-600 dark:text-[#D1D5DB] font-sans"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-bold text-[#121212] dark:text-white" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="font-serif italic text-gray-700 dark:text-[#E5E7EB]" {...props}>
      {children}
    </em>
  ),
  pre: ({ children, ...props }) => (
    <div className="my-5 overflow-x-auto always-visible-scrollbar bg-[#FBF9F7] dark:bg-[#1A1E27] border border-[#E5E1DA] dark:border-[#2C323E] rounded-none p-4 sm:p-5 shadow-2xs">
      <pre className="font-mono text-xs sm:text-sm text-[#121212] dark:text-gray-200 leading-relaxed m-0" {...props}>
        {children}
      </pre>
    </div>
  ),
  code: ({ className, children, ...props }: any) => {
    const isBlock = /language-/.test(className || "") || String(children).includes("\n");
    if (isBlock) {
      return (
        <code className="font-mono text-xs sm:text-sm text-[#121212] dark:text-gray-200 leading-relaxed block" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="font-mono text-xs bg-gray-100 dark:bg-[#262A33] border border-[#E5E1DA] dark:border-[#374151] text-[#121212] dark:text-[#F59E0B] px-1.5 py-0.5 rounded-none"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children, ...props }) => (
    <ScrollableTableWrapper className="my-6 border border-[#E5E1DA] dark:border-[#2C323E] rounded-none shadow-2xs">
      <table className="w-full text-left text-xs border-collapse" {...props}>
        {children}
      </table>
    </ScrollableTableWrapper>
  ),
  thead: ({ children, ...props }) => (
    <thead
      className="bg-[#FBF9F7] dark:bg-[#1A1E27] border-b border-[#E5E1DA] dark:border-[#2C323E]"
      {...props}
    >
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      className="p-3.5 text-[10px] uppercase tracking-wider font-bold text-[#121212] dark:text-white border-l first:border-l-0 border-[#E5E1DA] dark:border-[#2C323E]"
      {...props}
    >
      {children}
    </th>
  ),
  tr: ({ children, ...props }) => (
    <tr
      className="border-b border-[#E5E1DA] dark:border-[#2C323E] last:border-0 hover:bg-gray-50/50 dark:hover:bg-[#1C2028]/50 transition-colors"
      {...props}
    >
      {children}
    </tr>
  ),
  td: ({ children, ...props }) => (
    <td
      className="p-3.5 border-l first:border-l-0 border-[#E5E1DA] dark:border-[#2C323E] text-gray-600 dark:text-[#D1D5DB]"
      {...props}
    >
      {children}
    </td>
  ),
  hr: () => (
    <hr className="my-8 border-[#E5E1DA] dark:border-[#2C323E]" />
  ),
  a: ({ href, children, ...props }) => {
    if (href && href.startsWith("/")) {
      return (
        <Link
          to={href}
          className="font-bold text-[#121212] dark:text-white underline decoration-[#FE9A00] hover:opacity-80 transition-opacity"
        >
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-[#121212] dark:text-white underline decoration-[#FE9A00] hover:opacity-80 transition-opacity"
        {...props}
      >
        {children}
      </a>
    );
  },
};
