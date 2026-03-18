import { useEffect, useRef } from "react";
import { Tooltip } from "bootstrap";

/**
 * Renders an inline ⓘ glyph that shows a Bootstrap tooltip on hover/focus.
 * WCAG 2.1 AA compliant:
 *   - tabIndex="0"  → keyboard reachable (SC 2.1.1)
 *   - trigger "hover focus" (Bootstrap default) → tooltip fires on focus (SC 1.4.13)
 *   - Escape key dismisses the tooltip (Bootstrap default, SC 1.4.13 dismissible)
 *   - aria-label provides the text immediately to screen readers as the accessible name
 *   - Bootstrap sets aria-describedby on show, so content is also announced as a description
 *
 * Usage:
 *   <InfoTooltip text="Explanation of what this means." />
 *
 * Props:
 *   text       {string}  – tooltip content (required)
 *   placement  {string}  – top | bottom | left | right (default: "right")
 */
export default function InfoTooltip({ text, placement = "right" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const tip = new Tooltip(ref.current, { placement });
    return () => tip.dispose();
  }, [text, placement]);

  return (
    <span
      ref={ref}
      tabIndex={0}
      className="text-muted"
      style={{ cursor: "help", fontSize: "0.85rem" }}
      data-bs-toggle="tooltip"
      data-bs-placement={placement}
      title={text}
      aria-label={text}
    >
      &#9432;
    </span>
  );
}
