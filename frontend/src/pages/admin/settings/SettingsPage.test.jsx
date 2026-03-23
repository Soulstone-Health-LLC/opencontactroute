import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { toast } from "react-toastify";
import SettingsPage from "./SettingsPage";
import * as settingsService from "../../../services/settingsService";

// jsdom doesn't implement clipboard — stub it so component doesn't throw
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("../../../services/settingsService");
vi.mock("../../../hooks/useSiteConfig", () => ({
  useSiteConfig: () => ({ reloadSiteConfig: vi.fn() }),
}));

const mockConfig = {
  org_name: "Test Org",
  primary_color: "#123456",
};

function renderSettings() {
  return render(<SettingsPage />);
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(settingsService, "getSiteConfig").mockResolvedValue({
      data: mockConfig,
    });
    vi.spyOn(settingsService, "updateSiteConfig").mockResolvedValue({
      data: mockConfig,
    });
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

  describe("Instance & Branding", () => {
    it("renders the Instance & Branding card", async () => {
      renderSettings();
      await waitFor(() =>
        expect(screen.getByText(/instance & branding/i)).toBeInTheDocument(),
      );
    });

    it("renders the Organization Name input", async () => {
      renderSettings();
      await waitFor(() =>
        expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument(),
      );
    });

    it("renders the Primary Color picker", async () => {
      renderSettings();
      await waitFor(() =>
        expect(screen.getByTitle(/choose primary color/i)).toBeInTheDocument(),
      );
    });

    it("pre-populates inputs with loaded config values", async () => {
      renderSettings();
      await waitFor(() =>
        expect(screen.getByLabelText(/organization name/i)).toHaveValue(
          "Test Org",
        ),
      );
      expect(screen.getByLabelText(/primary color hex value/i)).toHaveValue(
        "#123456",
      );
    });

    it("renders the Save Settings button", async () => {
      renderSettings();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /save settings/i }),
        ).toBeInTheDocument(),
      );
    });

    it("calls updateSiteConfig on form submit", async () => {
      const user = userEvent.setup();
      renderSettings();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /save settings/i }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /save settings/i }));

      await waitFor(() =>
        expect(settingsService.updateSiteConfig).toHaveBeenCalledWith(
          expect.objectContaining({ org_name: "Test Org" }),
        ),
      );
    });

    it("shows a success toast after saving", async () => {
      const user = userEvent.setup();
      renderSettings();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /save settings/i }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /save settings/i }));

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Settings saved."),
      );
    });

    it("shows an error toast when save fails", async () => {
      vi.spyOn(settingsService, "updateSiteConfig").mockRejectedValue(
        new Error("Network Error"),
      );
      const user = userEvent.setup();
      renderSettings();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /save settings/i }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /save settings/i }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Failed to save settings."),
      );
    });

    it("shows an error alert when loading config fails", async () => {
      vi.spyOn(settingsService, "getSiteConfig").mockRejectedValue(
        new Error("Network Error"),
      );
      renderSettings();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        /failed to load settings/i,
      );
    });
  });
});
