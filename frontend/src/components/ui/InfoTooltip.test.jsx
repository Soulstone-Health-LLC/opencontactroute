import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import InfoTooltip from "./InfoTooltip";

vi.mock("bootstrap", () => ({
  Tooltip: class {
    constructor() {}
    dispose() {}
  },
}));

describe("InfoTooltip", () => {
  it("renders the ⓘ glyph", () => {
    render(<InfoTooltip text="Some explanation." />);
    expect(screen.getByText("ⓘ")).toBeInTheDocument();
  });

  it("has tabIndex=0 so keyboard users can reach it (WCAG 2.1.1)", () => {
    render(<InfoTooltip text="Some explanation." />);
    expect(screen.getByText("ⓘ")).toHaveAttribute("tabindex", "0");
  });

  it("exposes tooltip text to screen readers via a visually-hidden span", () => {
    render(<InfoTooltip text="Some explanation." />);
    expect(screen.getByText("Some explanation.")).toBeInTheDocument();
  });

  it("sets the Bootstrap title attribute used as tooltip content", () => {
    render(<InfoTooltip text="Some explanation." />);
    expect(screen.getByText("ⓘ")).toHaveAttribute("title", "Some explanation.");
  });

  it("uses cursor:help to signal informational content", () => {
    render(<InfoTooltip text="Some explanation." />);
    expect(screen.getByText("ⓘ")).toHaveStyle({ cursor: "help" });
  });

  it("accepts a custom placement prop", () => {
    render(<InfoTooltip text="Some explanation." placement="top" />);
    expect(screen.getByText("ⓘ")).toHaveAttribute("data-bs-placement", "top");
  });
});
