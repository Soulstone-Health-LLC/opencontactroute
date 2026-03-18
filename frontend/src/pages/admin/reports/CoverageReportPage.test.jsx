import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CoverageReportPage from "./CoverageReportPage";
import * as reportService from "../../../services/reportService";
import * as exportCsvModule from "../../../utils/exportCsv";

vi.mock("../../../utils/exportCsv", () => ({
  exportToCsv: vi.fn(),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockCoverageData = {
  total_possible: 12,
  published: 7,
  draft: 2,
  uncovered: 3,
  published_combinations: [
    {
      pathway_id: "pw1",
      department: "Claims",
      audience: { _id: "a1", name: "Members" },
      plan: { _id: "p1", name: "HMO" },
      topic: { _id: "t1", name: "Billing" },
    },
  ],
  draft_combinations: [
    {
      pathway_id: "pw2",
      department: "Support",
      audience: { _id: "a1", name: "Members" },
      plan: { _id: "p2", name: "PPO" },
      topic: { _id: "t2", name: "Claims" },
    },
  ],
  uncovered_combinations: [
    {
      audience: { _id: "a2", name: "Providers" },
      plan: { _id: "p1", name: "HMO" },
      topic: { _id: "t3", name: "Referrals" },
    },
    {
      audience: { _id: "a2", name: "Providers" },
      plan: { _id: "p2", name: "PPO" },
      topic: { _id: "t4", name: "Auth" },
    },
  ],
};

function setupMock(data = mockCoverageData) {
  vi.spyOn(reportService, "getPathwayCoverage").mockResolvedValue({ data });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CoverageReportPage />
    </MemoryRouter>,
  );
}

describe("CoverageReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Layout", () => {
    it("renders the page heading", () => {
      setupMock();
      renderPage();
      expect(
        screen.getByRole("heading", { name: /pathway coverage/i }),
      ).toBeInTheDocument();
    });

    it("renders a back link to /admin/reports", () => {
      setupMock();
      renderPage();
      const link = screen.getByRole("link", { name: /reports/i });
      expect(link).toHaveAttribute("href", "/admin/reports");
    });

    it("renders the Uncovered Combinations section heading", () => {
      setupMock();
      renderPage();
      expect(screen.getByText(/uncovered combinations/i)).toBeInTheDocument();
      expect(screen.getByText(/published combinations/i)).toBeInTheDocument();
      expect(screen.getByText(/draft combinations/i)).toBeInTheDocument();
    });

    it("renders all four stat labels", () => {
      setupMock();
      renderPage();
      expect(screen.getByText(/total possible/i)).toBeInTheDocument();
      expect(screen.getAllByText(/published/i).length).toBeGreaterThanOrEqual(
        1,
      );
      expect(screen.getByText(/^draft$/i)).toBeInTheDocument();
      expect(screen.getByText(/^uncovered$/i)).toBeInTheDocument();
    });
  });

  describe("Data display", () => {
    it("shows coverage stats after loading", async () => {
      setupMock();
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("12")).toBeInTheDocument();
        expect(screen.getByText("7")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
      });
    });

    it("shows uncovered combination rows after loading", async () => {
      setupMock();
      renderPage();
      await waitFor(() => {
        expect(screen.getAllByText("Providers").length).toBeGreaterThanOrEqual(
          1,
        );
        expect(screen.getByText("Referrals")).toBeInTheDocument();
      });
    });

    it("shows published combination rows after loading", async () => {
      setupMock();
      renderPage();
      await waitFor(() => {
        expect(screen.getAllByText("HMO").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Billing").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Claims").length).toBeGreaterThanOrEqual(1); // appears as department
      });
    });

    it("shows draft combination rows after loading", async () => {
      setupMock();
      renderPage();
      await waitFor(() => {
        expect(screen.getAllByText("PPO").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Support")).toBeInTheDocument(); // department
      });
    });

    it("renders Department column header for published and draft tables", async () => {
      setupMock();
      renderPage();
      await waitFor(() => {
        const deptHeaders = screen.getAllByRole("columnheader", {
          name: /department/i,
        });
        expect(deptHeaders).toHaveLength(2);
      });
    });

    it("does not render Department column header for uncovered table", async () => {
      setupMock();
      renderPage();
      await waitFor(() => {
        // 3 tables total; only 2 have Department headers
        const deptHeaders = screen.getAllByRole("columnheader", {
          name: /department/i,
        });
        expect(deptHeaders).toHaveLength(2);
      });
    });

    it("calls getPathwayCoverage exactly once on mount", () => {
      setupMock();
      renderPage();
      expect(reportService.getPathwayCoverage).toHaveBeenCalledTimes(1);
    });
  });

  describe("Empty states", () => {
    it("shows all-covered message when uncovered list is empty", async () => {
      setupMock({
        ...mockCoverageData,
        uncovered: 0,
        uncovered_combinations: [],
      });
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText(/all combinations are covered/i),
        ).toBeInTheDocument();
      });
    });

    it("shows no-published message when published list is empty", async () => {
      setupMock({
        ...mockCoverageData,
        published: 0,
        published_combinations: [],
      });
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText(/no published combinations/i),
        ).toBeInTheDocument();
      });
    });

    it("shows no-draft message when draft list is empty", async () => {
      setupMock({ ...mockCoverageData, draft: 0, draft_combinations: [] });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/no draft combinations/i)).toBeInTheDocument();
      });
    });
  });

  describe("Error states", () => {
    it("shows error message when fetch fails", async () => {
      vi.spyOn(reportService, "getPathwayCoverage").mockRejectedValue(
        new Error("fail"),
      );
      renderPage();
      await waitFor(() => {
        expect(
          screen.getAllByText(/failed to load coverage data/i).length,
        ).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("CSV export", () => {
    it("renders 3 Export CSV buttons (one per table)", () => {
      setupMock();
      renderPage();
      expect(
        screen.getAllByRole("button", { name: /export csv/i }),
      ).toHaveLength(3);
    });

    it("Export CSV buttons are disabled while loading", () => {
      setupMock();
      renderPage();
      screen
        .getAllByRole("button", { name: /export csv/i })
        .forEach((btn) => expect(btn).toBeDisabled());
    });

    it("Export CSV buttons are enabled after data loads", async () => {
      setupMock();
      renderPage();
      await waitFor(() => {
        screen
          .getAllByRole("button", { name: /export csv/i })
          .forEach((btn) => expect(btn).not.toBeDisabled());
      });
    });

    it("calls exportToCsv with published data when Published CSV button is clicked", async () => {
      setupMock();
      renderPage();
      const user = userEvent.setup();
      await waitFor(() =>
        expect(
          screen.getAllByRole("button", { name: /export csv/i })[0],
        ).not.toBeDisabled(),
      );
      await user.click(
        screen.getAllByRole("button", { name: /export csv/i })[0],
      );
      expect(exportCsvModule.exportToCsv).toHaveBeenCalledWith(
        "published-combinations.csv",
        ["Audience", "Plan", "Topic", "Department"],
        expect.arrayContaining([["Members", "HMO", "Billing", "Claims"]]),
      );
    });

    it("calls exportToCsv with uncovered data when Uncovered CSV button is clicked", async () => {
      setupMock();
      renderPage();
      const user = userEvent.setup();
      await waitFor(() =>
        expect(
          screen.getAllByRole("button", { name: /export csv/i })[2],
        ).not.toBeDisabled(),
      );
      await user.click(
        screen.getAllByRole("button", { name: /export csv/i })[2],
      );
      expect(exportCsvModule.exportToCsv).toHaveBeenCalledWith(
        "uncovered-combinations.csv",
        ["Audience", "Plan", "Topic"],
        expect.arrayContaining([["Providers", "HMO", "Referrals"]]),
      );
    });

    it("Export CSV button is disabled when all combinations are covered", async () => {
      setupMock({
        ...mockCoverageData,
        uncovered: 0,
        uncovered_combinations: [],
      });
      renderPage();
      await waitFor(() => {
        // uncovered button (index 2) should be disabled; published/draft are still enabled
        expect(
          screen.getAllByRole("button", { name: /export csv/i })[2],
        ).toBeDisabled();
      });
    });
  });
});
