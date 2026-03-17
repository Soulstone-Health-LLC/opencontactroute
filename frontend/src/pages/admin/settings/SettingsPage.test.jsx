import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { toast } from "react-toastify";
import SettingsPage from "./SettingsPage";

// jsdom doesn't implement clipboard — stub it so component doesn't throw
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});

vi.mock("react-toastify", () => ({ toast: { success: vi.fn() } }));

function renderSettings() {
  return render(<SettingsPage />);
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Layout", () => {
    it("renders the Settings heading", () => {
      renderSettings();
      expect(
        screen.getByRole("heading", { name: /settings/i }),
      ).toBeInTheDocument();
    });

    it("renders the Widget Embed card", () => {
      renderSettings();
      expect(screen.getByText(/widget embed/i)).toBeInTheDocument();
    });

    it("renders a read-only direct URL input", () => {
      renderSettings();
      const input = screen.getByLabelText(/widget direct url/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("readOnly");
    });

    it("renders a read-only embed code textarea", () => {
      renderSettings();
      const textarea = screen.getByLabelText(/widget iframe embed code/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute("readOnly");
    });

    it("embed code textarea contains an iframe tag", () => {
      renderSettings();
      const textarea = screen.getByLabelText(/widget iframe embed code/i);
      expect(textarea.value).toContain("<iframe");
      expect(textarea.value).toContain("</iframe>");
    });

    it("embed code contains the /v1/widget path", () => {
      renderSettings();
      const textarea = screen.getByLabelText(/widget iframe embed code/i);
      expect(textarea.value).toContain("/v1/widget");
    });

    it("direct URL input contains the /v1/widget path", () => {
      renderSettings();
      const input = screen.getByLabelText(/widget direct url/i);
      expect(input.value).toContain("/v1/widget");
    });

    it("renders Copy button for the direct URL", () => {
      renderSettings();
      expect(
        screen.getByRole("button", { name: /copy direct url/i }),
      ).toBeInTheDocument();
    });

    it("renders Copy button for the embed code", () => {
      renderSettings();
      expect(
        screen.getByRole("button", { name: /copy embed code/i }),
      ).toBeInTheDocument();
    });

    it("renders a live preview iframe", () => {
      renderSettings();
      const iframe = screen.getByTitle(/widget preview/i);
      expect(iframe).toBeInTheDocument();
      expect(iframe.tagName).toBe("IFRAME");
    });

    it("live preview iframe src contains /v1/widget", () => {
      renderSettings();
      const iframe = screen.getByTitle(/widget preview/i);
      expect(iframe.getAttribute("src")).toContain("/v1/widget");
    });
  });

  describe("Copy buttons", () => {
    it("has a Copy button for the direct URL", () => {
      renderSettings();
      expect(
        screen.getByRole("button", { name: /copy direct url/i }),
      ).toBeInTheDocument();
    });

    it("has a Copy button for the embed code", () => {
      renderSettings();
      expect(
        screen.getByRole("button", { name: /copy embed code/i }),
      ).toBeInTheDocument();
    });

    it("shows a toast when the URL copy button is clicked", async () => {
      const user = userEvent.setup();
      renderSettings();

      await user.click(
        screen.getByRole("button", { name: /copy direct url/i }),
      );

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("URL copied to clipboard."),
      );
    });

    it("shows a toast when the embed code copy button is clicked", async () => {
      const user = userEvent.setup();
      renderSettings();

      await user.click(
        screen.getByRole("button", { name: /copy embed code/i }),
      );

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith(
          "Embed code copied to clipboard.",
        ),
      );
    });
  });
});
