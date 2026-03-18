import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ContentAuditReportPage from "./ContentAuditReportPage";
import * as reportService from "../../../services/reportService";
import * as exportCsvModule from "../../../utils/exportCsv";

vi.mock("../../../utils/exportCsv", () => ({
  exportToCsv: vi.fn(),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeRow(overrides = {}) {
  return {
    _id: "pw1",
    audience_id: { name: "Members", slug: "members" },
    plan_id: { name: "HMO", slug: "hmo" },
    topic_id: { name: "Billing", slug: "billing" },
    department: "Claims",
    status: "published",
    published_at: "2024-01-15T00:00:00.000Z",
    updated_by: { email: "admin@example.com" },
    updatedAt: "2024-02-10T00:00:00.000Z",
    ...overrides,
  };
}

const mockPageOne = {
  total: 2,
  page: 1,
  limit: 25,
  pages: 1,
  data: [
    makeRow(),
    makeRow({
      _id: "pw2",
      audience_id: { name: "Providers", slug: "providers" },
      plan_id: { name: "PPO", slug: "ppo" },
      topic_id: { name: "Referrals", slug: "referrals" },
      department: "Support",
      status: "draft",
      updated_by: { email: "editor@example.com" },
      updatedAt: "2024-03-01T00:00:00.000Z",
    }),
  ],
};

const mockEmpty = { total: 0, page: 1, limit: 25, pages: 1, data: [] };

function setupMock(data = mockPageOne) {
  vi.spyOn(reportService, "getContentAudit").mockResolvedValue({ data });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ContentAuditReportPage />
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ContentAuditReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Layout ──────────────────────────────────────────────────────────────────

  describe("Layout", () => {
    it("renders the page heading", () => {
      setupMock();
      renderPage();
      expect(
        screen.getByRole("heading", { name: /content audit/i }),
      ).toBeInTheDocument();
    });

    it("renders a back link to /admin/reports", () => {
      setupMock();
      renderPage();
      const link = screen.getByRole("link", { name: /reports/i });
      expect(link).toHaveAttribute("href", "/admin/reports");
    });

    it("renders the Status filter select", () => {
      setupMock();
      renderPage();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it("renders the Apply button", () => {
      setupMock();
      renderPage();
      expect(
        screen.getByRole("button", { name: /apply/i }),
      ).toBeInTheDocument();
    });

    it("renders table column headers", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.queryByRole("cell", { name: /members/i })).toBeTruthy(),
      );
      expect(
        screen.getByRole("columnheader", { name: /audience/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /plan/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /topic/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /department/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /status/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /last updated/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /updated by/i }),
      ).toBeInTheDocument();
    });
  });

  // ── Data display ────────────────────────────────────────────────────────────

  describe("Data display", () => {
    it("renders row data after loading", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("Members")).toBeInTheDocument(),
      );
      expect(screen.getByText("HMO")).toBeInTheDocument();
      expect(screen.getByText("Billing")).toBeInTheDocument();
      expect(screen.getByText("Claims")).toBeInTheDocument();
      expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    });

    it("renders a published status badge", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("published")).toBeInTheDocument(),
      );
      const badge = screen.getByText("published");
      expect(badge.className).toMatch(/bg-success/);
    });

    it("renders a draft status badge", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("draft")).toBeInTheDocument(),
      );
      const badge = screen.getByText("draft");
      expect(badge.className).toMatch(/bg-warning/);
    });

    it("renders formatted updatedAt date", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("Members")).toBeInTheDocument(),
      );
      // Feb 10, 2024 formatted by locale — just check a year appears
      expect(screen.getAllByText(/2024/).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Empty state ─────────────────────────────────────────────────────────────

  describe("Empty state", () => {
    it("shows empty message when no data", async () => {
      setupMock(mockEmpty);
      renderPage();
      await waitFor(() =>
        expect(screen.getByText(/no pathways found/i)).toBeInTheDocument(),
      );
    });
  });

  // ── Error state ─────────────────────────────────────────────────────────────

  describe("Error state", () => {
    it("shows error alert on fetch failure", async () => {
      vi.spyOn(reportService, "getContentAudit").mockRejectedValue(
        new Error("Network error"),
      );
      renderPage();
      await waitFor(() =>
        expect(
          screen.getByText(/failed to load content audit/i),
        ).toBeInTheDocument(),
      );
    });
  });

  // ── Filtering ────────────────────────────────────────────────────────────────

  describe("Filtering", () => {
    it("calls getContentAudit with status=published when filter applied", async () => {
      const spy = vi.spyOn(reportService, "getContentAudit").mockResolvedValue({
        data: mockPageOne,
      });
      renderPage();
      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText(/status/i), "published");
      await user.click(screen.getByRole("button", { name: /apply/i }));
      await waitFor(() => {
        const calls = spy.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.status).toBe("published");
      });
    });

    it("calls getContentAudit with status=draft when filter applied", async () => {
      const spy = vi.spyOn(reportService, "getContentAudit").mockResolvedValue({
        data: mockPageOne,
      });
      renderPage();
      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText(/status/i), "draft");
      await user.click(screen.getByRole("button", { name: /apply/i }));
      await waitFor(() => {
        const calls = spy.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.status).toBe("draft");
      });
    });

    it("resets to page 1 when filter is applied", async () => {
      const spy = vi.spyOn(reportService, "getContentAudit").mockResolvedValue({
        data: mockPageOne,
      });
      renderPage();
      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText(/status/i), "published");
      await user.click(screen.getByRole("button", { name: /apply/i }));
      await waitFor(() => {
        const calls = spy.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.page).toBe(1);
      });
    });
  });

  // ── Pagination ───────────────────────────────────────────────────────────────

  describe("Pagination", () => {
    it("shows pagination when multiple pages", async () => {
      setupMock({
        ...mockPageOne,
        total: 50,
        pages: 2,
      });
      renderPage();
      await waitFor(() =>
        expect(
          screen.getByRole("navigation", { name: /pagination/i }),
        ).toBeInTheDocument(),
      );
    });

    it("does not show pagination when only one page", async () => {
      setupMock(mockPageOne);
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("Members")).toBeInTheDocument(),
      );
      expect(
        screen.queryByRole("navigation", { name: /pagination/i }),
      ).not.toBeInTheDocument();
    });
  });

  // ── CSV export ───────────────────────────────────────────────────────────────

  describe("CSV export", () => {
    it("renders Export CSV button", () => {
      setupMock();
      renderPage();
      expect(
        screen.getByRole("button", { name: /export csv/i }),
      ).toBeInTheDocument();
    });

    it("Export CSV button is disabled while loading", () => {
      setupMock();
      renderPage();
      expect(
        screen.getByRole("button", { name: /export csv/i }),
      ).toBeDisabled();
    });

    it("Export CSV button is enabled after data loads", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /export csv/i }),
        ).not.toBeDisabled(),
      );
    });

    it("Export CSV button is disabled when rows are empty", async () => {
      setupMock(mockEmpty);
      renderPage();
      await waitFor(() =>
        expect(screen.getByText(/no pathways found/i)).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("button", { name: /export csv/i }),
      ).toBeDisabled();
    });

    it("calls exportToCsv with correct headers and row data", async () => {
      const exportSpy = vi.spyOn(exportCsvModule, "exportToCsv");
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /export csv/i }),
        ).not.toBeDisabled(),
      );
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: /export csv/i }));
      expect(exportSpy).toHaveBeenCalledWith(
        "content-audit.csv",
        [
          "Audience",
          "Plan",
          "Topic",
          "Department",
          "Status",
          "Last Updated",
          "Updated By",
        ],
        expect.arrayContaining([
          expect.arrayContaining([
            "Members",
            "HMO",
            "Billing",
            "Claims",
            "published",
          ]),
        ]),
      );
    });
  });
});
