import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import UtilizationReportPage from "./UtilizationReportPage";
import * as reportService from "../../../services/reportService";
import * as exportCsvModule from "../../../utils/exportCsv";

vi.mock("../../../utils/exportCsv", () => ({
  exportToCsv: vi.fn(),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockViewsData = {
  group_by: "day",
  data: [
    { period: "2026-02-17", count: 3 },
    { period: "2026-02-18", count: 7 },
  ],
};

const mockTopPathways = {
  data: [
    {
      pathway_id: "pw1",
      count: 10,
      audience: { name: "Members" },
      plan: { name: "HMO" },
      topic: { name: "Billing" },
      department: "Claims",
    },
  ],
};

const mockTopTopics = {
  data: [{ count: 7, topic: { _id: "t1", name: "Billing" } }],
};

const mockTopAudiences = {
  data: [{ count: 9, audience: { _id: "a1", name: "Members" } }],
};

const mockTopPlans = {
  data: [{ count: 6, plan: { _id: "p1", name: "HMO" } }],
};

function setupMocks() {
  vi.spyOn(reportService, "getPathwayViews").mockResolvedValue({
    data: mockViewsData,
  });
  vi.spyOn(reportService, "getTopPathways").mockResolvedValue({
    data: mockTopPathways,
  });
  vi.spyOn(reportService, "getTopTopics").mockResolvedValue({
    data: mockTopTopics,
  });
  vi.spyOn(reportService, "getTopAudiences").mockResolvedValue({
    data: mockTopAudiences,
  });
  vi.spyOn(reportService, "getTopPlans").mockResolvedValue({
    data: mockTopPlans,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <UtilizationReportPage />
    </MemoryRouter>,
  );
}

describe("UtilizationReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Layout", () => {
    it("renders the page heading", () => {
      setupMocks();
      renderPage();
      expect(
        screen.getByRole("heading", { name: /pathway utilization/i }),
      ).toBeInTheDocument();
    });

    it("renders a back link to /admin/reports", () => {
      setupMocks();
      renderPage();
      const link = screen.getByRole("link", { name: /reports/i });
      expect(link).toHaveAttribute("href", "/admin/reports");
    });

    it("renders filter controls with pre-populated dates", () => {
      setupMocks();
      renderPage();
      const startInput = screen.getByLabelText(/start date/i);
      const endInput = screen.getByLabelText(/end date/i);
      expect(startInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(endInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(startInput.value < endInput.value).toBe(true);
    });

    it("renders Group By and Show Top selects", () => {
      setupMocks();
      renderPage();
      expect(screen.getByLabelText(/group by/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/show top/i)).toBeInTheDocument();
    });

    it("renders the Apply button", () => {
      setupMocks();
      renderPage();
      expect(
        screen.getByRole("button", { name: /apply/i }),
      ).toBeInTheDocument();
    });

    it("renders all section headings", () => {
      setupMocks();
      renderPage();
      expect(screen.getByText(/pathway views over time/i)).toBeInTheDocument();
      expect(screen.getByText(/top pathways/i)).toBeInTheDocument();
      expect(screen.getByText(/top topics/i)).toBeInTheDocument();
      expect(screen.getByText(/top audiences/i)).toBeInTheDocument();
      expect(screen.getByText(/top plans/i)).toBeInTheDocument();
    });
  });

  describe("Data display", () => {
    it("shows views table rows after loading", async () => {
      setupMocks();
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("2026-02-17")).toBeInTheDocument();
        expect(screen.getByText("2026-02-18")).toBeInTheDocument();
      });
    });

    it("shows top pathway rows after loading", async () => {
      setupMocks();
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText(/members › hmo › billing/i),
        ).toBeInTheDocument();
        expect(screen.getByText("Claims")).toBeInTheDocument();
      });
    });

    it("shows top topic rows after loading", async () => {
      setupMocks();
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Billing")).toBeInTheDocument();
      });
    });

    it("shows top audience rows after loading", async () => {
      setupMocks();
      renderPage();
      await waitFor(() => {
        expect(screen.getAllByText("Members").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("shows top plan rows after loading", async () => {
      setupMocks();
      renderPage();
      await waitFor(() => {
        expect(screen.getAllByText("HMO").length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Filters", () => {
    it("calls all APIs on initial load", () => {
      setupMocks();
      renderPage();
      expect(reportService.getPathwayViews).toHaveBeenCalledTimes(1);
      expect(reportService.getTopPathways).toHaveBeenCalledTimes(1);
      expect(reportService.getTopTopics).toHaveBeenCalledTimes(1);
      expect(reportService.getTopAudiences).toHaveBeenCalledTimes(1);
      expect(reportService.getTopPlans).toHaveBeenCalledTimes(1);
    });

    it("re-fetches all APIs when Apply is clicked", async () => {
      setupMocks();
      renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /apply/i }));
      expect(reportService.getPathwayViews).toHaveBeenCalledTimes(2);
      expect(reportService.getTopPathways).toHaveBeenCalledTimes(2);
    });

    it("passes the selected top-N limit to top-pathway calls", async () => {
      setupMocks();
      renderPage();
      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText(/show top/i), "25");
      await user.click(screen.getByRole("button", { name: /apply/i }));
      expect(reportService.getTopPathways).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 25 }),
      );
    });
  });

  describe("Empty states", () => {
    it("shows empty message when no views data", async () => {
      vi.spyOn(reportService, "getPathwayViews").mockResolvedValue({
        data: { data: [] },
      });
      vi.spyOn(reportService, "getTopPathways").mockResolvedValue({
        data: mockTopPathways,
      });
      vi.spyOn(reportService, "getTopTopics").mockResolvedValue({
        data: mockTopTopics,
      });
      vi.spyOn(reportService, "getTopAudiences").mockResolvedValue({
        data: mockTopAudiences,
      });
      vi.spyOn(reportService, "getTopPlans").mockResolvedValue({
        data: mockTopPlans,
      });
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText(/no data for the selected period/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error states", () => {
    it("shows views error when pathway-views fetch fails", async () => {
      setupMocks();
      vi.spyOn(reportService, "getPathwayViews").mockRejectedValue(
        new Error("fail"),
      );
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText(/failed to load pathway views/i),
        ).toBeInTheDocument();
      });
    });

    it("shows pathways error when top-pathways fetch fails", async () => {
      setupMocks();
      vi.spyOn(reportService, "getTopPathways").mockRejectedValue(
        new Error("fail"),
      );
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText(/failed to load top pathways/i),
        ).toBeInTheDocument();
      });
    });

    it("shows tables error when top-topics fetch fails", async () => {
      setupMocks();
      vi.spyOn(reportService, "getTopTopics").mockRejectedValue(
        new Error("fail"),
      );
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText(/failed to load top topics/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("CSV export", () => {
    it("renders 5 Export CSV buttons", async () => {
      setupMocks();
      renderPage();
      await waitFor(() => {
        expect(
          screen.getAllByRole("button", { name: /export csv/i }),
        ).toHaveLength(5);
      });
    });

    it("Export CSV buttons are disabled while loading", () => {
      setupMocks();
      renderPage();
      const buttons = screen.getAllByRole("button", { name: /export csv/i });
      buttons.forEach((btn) => expect(btn).toBeDisabled());
    });

    it("Export CSV buttons are enabled after data loads", async () => {
      setupMocks();
      renderPage();
      await waitFor(() => {
        const buttons = screen.getAllByRole("button", { name: /export csv/i });
        buttons.forEach((btn) => expect(btn).not.toBeDisabled());
      });
    });

    it("calls exportToCsv with views data when Views CSV button is clicked", async () => {
      setupMocks();
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
        "pathway-views.csv",
        ["Period", "Views"],
        expect.arrayContaining([
          ["2026-02-17", 3],
          ["2026-02-18", 7],
        ]),
      );
    });

    it("calls exportToCsv with pathway data when Pathways CSV button is clicked", async () => {
      setupMocks();
      renderPage();
      const user = userEvent.setup();
      await waitFor(() =>
        expect(
          screen.getAllByRole("button", { name: /export csv/i })[1],
        ).not.toBeDisabled(),
      );
      await user.click(
        screen.getAllByRole("button", { name: /export csv/i })[1],
      );
      expect(exportCsvModule.exportToCsv).toHaveBeenCalledWith(
        "top-pathways.csv",
        ["#", "Audience", "Plan", "Topic", "Department", "Views"],
        expect.arrayContaining([
          [1, "Members", "HMO", "Billing", "Claims", 10],
        ]),
      );
    });
  });
});
