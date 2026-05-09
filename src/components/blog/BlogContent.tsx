/**
 * BlogContent — Server component
 * Renders the blog article markdown into styled React elements.
 * No external markdown library required — handles all patterns used in
 * the Warshety blog JSON content files.
 *
 * Supported syntax:
 *   # H1  ## H2  ### H3
 *   **bold**
 *   - unordered list
 *   1. ordered list
 *   > blockquote
 *   | table | rows |
 *   --- (horizontal rule)
 *   plain paragraphs
 */

import type { ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// INLINE PARSER  — handles **bold** within any text node
// ─────────────────────────────────────────────────────────────────────────────

function parseInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-slate-900 dark:text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK PARSER — line-by-line state machine
// ─────────────────────────────────────────────────────────────────────────────

function renderMarkdown(content: string): ReactNode[] {
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── H3 (check before H2 and H1 for specificity) ──────────────────────
    if (line.startsWith("### ")) {
      nodes.push(
        <h3
          key={key++}
          className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3"
        >
          {parseInline(line.slice(4))}
        </h3>,
      );
      i++;
      continue;
    }

    // ── H2 ───────────────────────────────────────────────────────────────
    if (line.startsWith("## ")) {
      nodes.push(
        <h2
          key={key++}
          className="text-2xl font-bold text-slate-900 dark:text-white mt-10 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700"
        >
          {parseInline(line.slice(3))}
        </h2>,
      );
      i++;
      continue;
    }

    // ── H1 ───────────────────────────────────────────────────────────────
    if (line.startsWith("# ")) {
      // H1 is already rendered in the page header — skip to avoid duplication
      i++;
      continue;
    }

    // ── Blockquote ───────────────────────────────────────────────────────
    if (line.startsWith("> ")) {
      nodes.push(
        <blockquote
          key={key++}
          className="border-s-4 border-[#FF4B19] ps-4 pe-4 py-3 my-6 rounded-e-xl bg-orange-50 dark:bg-orange-950/20 text-slate-700 dark:text-slate-300 italic text-[0.95rem] leading-relaxed"
        >
          {parseInline(line.slice(2))}
        </blockquote>,
      );
      i++;
      continue;
    }

    // ── Unordered list — collect consecutive `- ` lines ──────────────────
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul
          key={key++}
          className="list-disc list-outside ms-6 my-4 space-y-2 text-slate-700 dark:text-slate-300"
        >
          {items.map((item, j) => (
            <li key={j} className="leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // ── Ordered list — collect consecutive `N. ` lines ───────────────────
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      nodes.push(
        <ol
          key={key++}
          className="list-decimal list-outside ms-6 my-4 space-y-2 text-slate-700 dark:text-slate-300"
        >
          {items.map((item, j) => (
            <li key={j} className="leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // ── Table — collect consecutive `|` lines ────────────────────────────
    if (line.startsWith("|")) {
      const allRows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i]
          .split("|")
          .filter(Boolean)
          .map((c) => c.trim());
        allRows.push(cells);
        i++;
      }
      // Filter out separator rows (only dashes/colons)
      const dataRows = allRows.filter(
        (row) => !row.every((c) => /^[-: ]+$/.test(c)),
      );
      if (dataRows.length > 0) {
        nodes.push(
          <div
            key={key++}
            className="overflow-x-auto my-6 rounded-xl shadow-sm"
          >
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  {dataRows[0].map((h, j) => (
                    <th
                      key={j}
                      className="border border-slate-200 dark:border-slate-700 px-4 py-3 text-start font-semibold text-slate-900 dark:text-white"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.slice(1).map((row, j) => (
                  <tr
                    key={j}
                    className={
                      j % 2 === 0
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50 dark:bg-slate-800/50"
                    }
                  >
                    {row.map((cell, k) => (
                      <td
                        key={k}
                        className="border border-slate-200 dark:border-slate-700 px-4 py-3 text-slate-700 dark:text-slate-300"
                      >
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    // ── Horizontal rule ───────────────────────────────────────────────────
    if (/^[-*_]{3,}$/.test(line.trim())) {
      nodes.push(
        <hr
          key={key++}
          className="my-8 border-slate-200 dark:border-slate-700"
        />,
      );
      i++;
      continue;
    }

    // ── Empty line — skip ─────────────────────────────────────────────────
    if (line.trim() === "") {
      i++;
      continue;
    }

    // ── Paragraph ─────────────────────────────────────────────────────────
    nodes.push(
      <p
        key={key++}
        className="text-slate-700 dark:text-slate-300 leading-[1.85] mb-5 text-[1.0rem]"
      >
        {parseInline(line)}
      </p>,
    );
    i++;
  }

  return nodes;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function BlogContent({ content }: { content: string }) {
  return (
    <div className="blog-content max-w-none">{renderMarkdown(content)}</div>
  );
}
