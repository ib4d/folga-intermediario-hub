"use client";

import { useState, type CSSProperties } from "react";

type Props = {
  children: string;
  maxLength?: number;
  className?: string;
  style?: CSSProperties;
};

export default function ExpandableText({ children, maxLength = 96, className, style }: Props) {
  const [expanded, setExpanded] = useState(false);
  const shouldClamp = children.length > maxLength;
  const visibleText = !shouldClamp || expanded ? children : `${children.slice(0, maxLength).trim()}...`;

  return (
    <span className={className} style={style}>
      {visibleText}
      {shouldClamp ? (
        <button
          type="button"
          className="inline-more-button"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Ver menos" : "Ver mas"}
        </button>
      ) : null}
    </span>
  );
}
