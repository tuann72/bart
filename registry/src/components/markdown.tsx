"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Render model and user-authored Markdown without allowing raw HTML. */
export function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="bart-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ node: _node, href, children: linkChildren, ...props }) => {
            const external =
              href?.startsWith("https://") || href?.startsWith("http://");
            return (
              <a
                {...props}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer noopener" : undefined}
              >
                {linkChildren}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
