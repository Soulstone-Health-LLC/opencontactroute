import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import DashboardPage from "./DashboardPage";
import * as audienceService from "../../services/audienceService";
import * as planService from "../../services/planService";
import * as topicService from "../../services/topicService";
import * as pathwayService from "../../services/pathwayService";
import * as reportService from "../../services/reportService";

const mockAudiences = [
  { _id: "a1", name: "Members" },
  { _id: "a2", name: "Providers" },
];
const mockPlans = [
  { _id: "p1", name: "HMO" },
  { _id: "p2", name: "PPO" },
  { _id: "p3", name: "EPO" },
];
const mockTopics = [{ _id: "t1", name: "Billing" }];
const mockPathways = [
  { _id: "pw1", name: "HMO Member Billing", status: "published" },
  { _id: "pw2", name: "PPO Provider Auth", status: "draft" },
  { _id: "pw3", name: "EPO Claims", status: "published" },
];
const mockRecentPathways = [
  {
    _id: "pw1",
    status: "published",
    audience_id: { name: "Members" },
    plan_id: { name: "HMO" },
    topic_id: { name: "Billing" },
    updatedAt: "2026-03-10T12:00:00.000Z",
  },
  {
    _id: "pw2",
    status: "draft",
    audience_id: { name: "Providers" },
    plan_id: { name: "PPO" },
    topic_id: { name: "Auth" },
    updatedAt: "2026-03-09T08:00:00.000Z",
  },
];

function setupMocks() {
  vi.spyOn(audienceService, "getAudiences").mockResolvedValue({
    data: mockAudiences,
  });
  vi.spyOn(planService, "getPlans").mockResolvedValue({ data: mockPlans });
  vi.spyOn(topicService, "getTopics").mockResolvedValue({ data: mockTopics });
  vi.spyOn(pathwayService, "getPathways").mockResolvedValue({
    data: mockPathways,
  });
  vi.spyOn(reportService, "getContentAudit").mockResolvedValue({
    data: { total: 2, page: 1, limit: 5, pages: 1, data: mockRecentPathways },
  });
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Layout", () => {
    it("renders the Dashboard heading", async () => {
      setupMocks();
      renderDashboard();
      expect(
        screen.getByRole("heading", { name: /dashboard/i }),
      ).toBeInTheDocument();
    });

    it("renders a View Reports link", async () => {
      setupMocks();
      renderDashboard();
      expect(
        screen.getByRole("link", { name: /view reports/i }),
      ).toBeInTheDocument();
    });

    it("renders all four stat card labels", async () => {
      setupMocks();
      renderDashboard();
      expect(screen.getByText(/published pathways/i)).toBeInTheDocument();
      expect(screen.getByText(/audiences/i)).toBeInTheDocument();
      expect(screen.getByText(/plans/i)).toBeInTheDocument();
      expect(screen.getByText(/topics/i)).toBeInTheDocument();
    });

    it("renders the Recently Updated Pathways section", async () => {
      setupMocks();
      renderDashboard();
      expect(
        screen.getByRole("heading", { name: /recently updated pathways/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Data loading", () => {
    it("displays correct stat counts after loading", async () => {
      setupMocks();
      renderDashboard();
      // Published Pathways: 2, Audiences: 2, Plans: 3, Topics: 1
      await waitFor(() => {
        expect(screen.getAllByText("2")).toHaveLength(2);
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("1")).toBeInTheDocument();
      });
    });

    it("renders pathway rows in the table after loading", async () => {
      setupMocks();
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText("Members")).toBeInTheDocument(),
      );
      expect(screen.getByText("Providers")).toBeInTheDocument();
    });

    it("shows published badge for published pathways", async () => {
      setupMocks();
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText("Members")).toBeInTheDocument(),
      );
      expect(screen.getByText("published")).toBeInTheDocument();
    });

    it("shows draft badge for draft pathways", async () => {
      setupMocks();
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText("Providers")).toBeInTheDocument(),
      );
      expect(screen.getByText("draft")).toBeInTheDocument();
    });

    it("renders an Edit link for each pathway row", async () => {
      setupMocks();
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText("Members")).toBeInTheDocument(),
      );
      const editLinks = screen.getAllByRole("link", { name: /edit/i });
      expect(editLinks).toHaveLength(2);
    });

    it("renders a no-pathways message when content audit returns empty", async () => {
      vi.spyOn(audienceService, "getAudiences").mockResolvedValue({ data: [] });
      vi.spyOn(planService, "getPlans").mockResolvedValue({ data: [] });
      vi.spyOn(topicService, "getTopics").mockResolvedValue({ data: [] });
      vi.spyOn(pathwayService, "getPathways").mockResolvedValue({ data: [] });
      vi.spyOn(reportService, "getContentAudit").mockResolvedValue({
        data: { total: 0, page: 1, limit: 5, pages: 0, data: [] },
      });

      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText(/no pathways found/i)).toBeInTheDocument(),
      );
    });
  });

  describe("Error handling", () => {
    it("shows an error alert if any API call fails", async () => {
      vi.spyOn(audienceService, "getAudiences").mockRejectedValue(
        new Error("Network error"),
      );
      vi.spyOn(planService, "getPlans").mockResolvedValue({ data: [] });
      vi.spyOn(topicService, "getTopics").mockResolvedValue({ data: [] });
      vi.spyOn(pathwayService, "getPathways").mockResolvedValue({ data: [] });
      vi.spyOn(reportService, "getContentAudit").mockResolvedValue({
        data: { total: 0, page: 1, limit: 5, pages: 0, data: [] },
      });

      renderDashboard();
      await waitFor(() =>
        expect(
          screen.getByText(/failed to load dashboard data/i),
        ).toBeInTheDocument(),
      );
    });

    it("error alert has role=alert", async () => {
      vi.spyOn(audienceService, "getAudiences").mockRejectedValue(
        new Error("fail"),
      );
      vi.spyOn(planService, "getPlans").mockResolvedValue({ data: [] });
      vi.spyOn(topicService, "getTopics").mockResolvedValue({ data: [] });
      vi.spyOn(pathwayService, "getPathways").mockResolvedValue({ data: [] });
      vi.spyOn(reportService, "getContentAudit").mockResolvedValue({
        data: { total: 0, page: 1, limit: 5, pages: 0, data: [] },
      });

      renderDashboard();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    });
  });
});
