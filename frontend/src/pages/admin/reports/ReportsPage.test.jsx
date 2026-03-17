import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ReportsPage from "./ReportsPage";
import * as reportService from "../../../services/reportService";

// Recharts uses ResizeObserver and SVG features not available in jsdom
vi.mock("recharts", () => {
  const MockResponsiveContainer = ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  );
  const MockLineChart = ({ children }) => <svg>{children}</svg>;
  const MockBarChart = ({ children }) => <svg>{children}</svg>;
  const MockLine = () => null;
  const MockBar = () => null;
  const MockXAxis = () => null;
  const MockYAxis = () => null;
  const MockCartesianGrid = () => null;
  const MockTooltip = () => null;
  const MockLegend = () => null;
  return {
    ResponsiveContainer: MockResponsiveContainer,
    LineChart: MockLineChart,
    BarChart: MockBarChart,
    Line: MockLine,
    Bar: MockBar,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    CartesianGrid: MockCartesianGrid,
    Tooltip: MockTooltip,
    Legend: MockLegend,
  };
});

vi.mock("../../../hooks/useAuth");
import { useAuth } from "../../../hooks/useAuth";

// ── Fixtures ────────────────────────────────────────────────
const mockViewsData = {
  group_by: "day",
  data: [
    { period: "2026-03-01", count: 5 },
    { period: "2026-03-02", count: 8 },
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
const mockTopPlans = { data: [{ count: 6, plan: { _id: "p1", name: "HMO" } }] };
const mockCoverage = {
  total_possible: 64,
  published: 24,
  draft: 4,
  uncovered: 36,
  uncovered_combinations: [
    {
      audience: { name: "Members" },
      plan: { name: "PPO" },
      topic: { name: "Claims" },
    },
  ],
};
const mockContentAudit = {
  total: 2,
  page: 1,
  limit: 25,
  pages: 1,
  data: [
    {
      _id: "ca1",
      audience_id: { name: "Members" },
      plan_id: { name: "HMO" },
      topic_id: { name: "Billing" },
      status: "published",
      updatedAt: "2026-03-10T12:00:00.000Z",
      updated_by: { email: "admin@example.com" },
    },
    {
      _id: "ca2",
      audience_id: { name: "Providers" },
      plan_id: { name: "PPO" },
      topic_id: { name: "Auth" },
      status: "draft",
      updatedAt: "2026-03-09T08:00:00.000Z",
      updated_by: { email: "editor@example.com" },
    },
  ],
};
const mockAuditLog = {
  total: 1,
  page: 1,
  limit: 25,
  pages: 1,
  data: [
    {
      _id: "al1",
      resource: "ContactPathway",
      action: "update",
      changed_by: { email: "admin@example.com" },
      changed_at: "2026-03-10T12:00:00.000Z",
      changes: [
        { field: "status", old_value: "draft", new_value: "published" },
      ],
    },
  ],
};

function setupMocks(isAdmin = false) {
  useAuth.mockReturnValue({
    user: {
      _id: "u1",
      email: "test@example.com",
      user_role: isAdmin ? "admin" : "editor",
    },
  });
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
  vi.spyOn(reportService, "getPathwayCoverage").mockResolvedValue({
    data: mockCoverage,
  });
  vi.spyOn(reportService, "getContentAudit").mockResolvedValue({
    data: mockContentAudit,
  });
  vi.spyOn(reportService, "getAuditLog").mockResolvedValue({
    data: mockAuditLog,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>,
  );
}

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Layout", () => {
    it("renders the Reports heading", () => {
      setupMocks();
      renderPage();
      expect(
        screen.getByRole("heading", { name: /reports/i }),
      ).toBeInTheDocument();
    });

    it("renders the date range filter form", () => {
      setupMocks();
      renderPage();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /apply/i }),
      ).toBeInTheDocument();
    });

    it("renders section headings", () => {
      setupMocks();
      renderPage();
      expect(screen.getByText(/pathway views over time/i)).toBeInTheDocument();
      expect(screen.getByText(/top pathways/i)).toBeInTheDocument();
      expect(screen.getByText(/top topics/i)).toBeInTheDocument();
      expect(screen.getByText(/top audiences/i)).toBeInTheDocument();
      expect(screen.getByText(/top plans/i)).toBeInTheDocument();
      expect(screen.getByText(/pathway coverage/i)).toBeInTheDocument();
      expect(screen.getByText(/content audit/i)).toBeInTheDocument();
    });
  });

  describe("Coverage stats", () => {
    it("shows coverage stat cards after loading", async () => {
      setupMocks();
      renderPage();
      // "Published" and "Draft" also appear in the content-audit status dropdown
      await waitFor(() => {
        expect(screen.getByText("Total Possible")).toBeInTheDocument();
        expect(screen.getByText("64")).toBeInTheDocument();
        expect(screen.getAllByText("Published").length).toBeGreaterThanOrEqual(
          1,
        );
        expect(screen.getByText("24")).toBeInTheDocument();
        expect(screen.getAllByText("Draft").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Uncovered")).toBeInTheDocument();
        expect(screen.getByText("36")).toBeInTheDocument();
      });
    });
  });

  describe("Top Pathways table", () => {
    it("shows pathway rows after loading", async () => {
      setupMocks();
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText(/members › hmo › billing/i),
        ).toBeInTheDocument();
        expect(screen.getByText("Claims")).toBeInTheDocument();
      });
    });
  });

  describe("Content Audit table", () => {
    it("shows content audit rows after loading", async () => {
      setupMocks();
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      });
    });

    it("shows status badges for content audit rows", async () => {
      setupMocks();
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("published")).toBeInTheDocument();
        expect(screen.getByText("draft")).toBeInTheDocument();
      });
    });
  });

  describe("Audit Log (admin gating)", () => {
    it("does not show Audit Log section for non-admin", () => {
      setupMocks(false);
      renderPage();
      expect(screen.queryByText(/audit log/i)).not.toBeInTheDocument();
    });

    it("shows Audit Log section for admin users", () => {
      setupMocks(true);
      renderPage();
      expect(screen.getByText(/audit log/i)).toBeInTheDocument();
    });

    it("shows audit log rows for admin after loading", async () => {
      setupMocks(true);
      renderPage();
      await waitFor(() => {
        // "ContactPathway" also appears in the resource filter dropdown
        expect(
          screen.getAllByText("ContactPathway").length,
        ).toBeGreaterThanOrEqual(1);
        // "update" (badge text) vs "Update" (option text) — badge is lowercase
        expect(screen.getByText("update")).toBeInTheDocument();
      });
    });

    it("does not call getAuditLog for non-admin", () => {
      setupMocks(false);
      renderPage();
      expect(reportService.getAuditLog).not.toHaveBeenCalled();
    });
  });

  describe("Error states", () => {
    it("shows utilization error when utilization fetch fails", async () => {
      setupMocks();
      vi.spyOn(reportService, "getPathwayViews").mockRejectedValue(
        new Error("Network error"),
      );
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText(/failed to load utilization data/i),
        ).toBeInTheDocument();
      });
    });

    it("shows coverage error when coverage fetch fails", async () => {
      setupMocks();
      vi.spyOn(reportService, "getPathwayCoverage").mockRejectedValue(
        new Error("fail"),
      );
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText(/failed to load pathway coverage/i),
        ).toBeInTheDocument();
      });
    });

    it("shows content audit error when fetch fails", async () => {
      setupMocks();
      vi.spyOn(reportService, "getContentAudit").mockRejectedValue(
        new Error("fail"),
      );
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText(/failed to load content audit/i),
        ).toBeInTheDocument();
      });
    });

    it("shows audit log error when fetch fails (admin)", async () => {
      setupMocks(true);
      vi.spyOn(reportService, "getAuditLog").mockRejectedValue(
        new Error("fail"),
      );
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText(/failed to load audit log/i),
        ).toBeInTheDocument();
      });
    });
  });
});
