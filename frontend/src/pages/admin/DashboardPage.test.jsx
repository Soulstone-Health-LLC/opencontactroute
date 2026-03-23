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
  { _id: "a1", name: "Members", is_active: true },
  { _id: "a2", name: "Providers", is_active: true },
];
const mockPlans = [
  { _id: "p1", name: "HMO", is_active: true },
  { _id: "p2", name: "PPO", is_active: true },
  { _id: "p3", name: "EPO", is_active: true },
];
const mockTopics = [{ _id: "t1", name: "Billing", is_active: true }];
const mockPathways = [
  { _id: "pw1", name: "HMO Member Billing", status: "published" },
  { _id: "pw2", name: "PPO Provider Auth", status: "draft" },
  { _id: "pw3", name: "EPO Claims", status: "published" },
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
  vi.spyOn(reportService, "getPathwayViews").mockResolvedValue({
    data: { data: [], group_by: "day" },
  });
  vi.spyOn(reportService, "getTopPathways").mockResolvedValue({
    data: { data: [] },
  });
  vi.spyOn(reportService, "getTopTopics").mockResolvedValue({
    data: { data: [] },
  });
  vi.spyOn(reportService, "getTopAudiences").mockResolvedValue({
    data: { data: [] },
  });
  vi.spyOn(reportService, "getTopPlans").mockResolvedValue({
    data: { data: [] },
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
      expect(screen.getByText("Active Audiences")).toBeInTheDocument();
      expect(screen.getByText("Active Plans")).toBeInTheDocument();
      expect(screen.getByText("Active Topics")).toBeInTheDocument();
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
  });

  describe("Error handling", () => {
    it("shows an error alert if any API call fails", async () => {
      vi.spyOn(audienceService, "getAudiences").mockRejectedValue(
        new Error("Network error"),
      );
      vi.spyOn(planService, "getPlans").mockResolvedValue({ data: [] });
      vi.spyOn(topicService, "getTopics").mockResolvedValue({ data: [] });
      vi.spyOn(pathwayService, "getPathways").mockResolvedValue({ data: [] });

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

      renderDashboard();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    });
  });
});
