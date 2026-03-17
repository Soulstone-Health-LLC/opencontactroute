import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import WidgetPage from "./WidgetPage";
import * as widgetService from "../../services/widgetService";

vi.mock("../../hooks/useSiteConfig", () => ({
  useSiteConfig: () => ({
    siteConfig: {
      instance_name: "OpenContactRoute",
      org_name: "",
      primary_color: "#0d6efd",
    },
  }),
}));

const mockAudiences = [
  { _id: "a1", name: "Employer", description: "Employer group" },
  { _id: "a2", name: "Individual", description: "" },
];
const mockPlans = [
  { _id: "p1", name: "HMO", description: "" },
  { _id: "p2", name: "PPO", description: "" },
];
const mockTopics = [
  { _id: "t1", name: "Dental", description: "" },
  { _id: "t2", name: "Vision", description: "" },
];
const mockPathway = {
  _id: "pw1",
  audience_id: { _id: "a1", name: "Employer" },
  plan_id: { _id: "p1", name: "HMO" },
  topic_id: { _id: "t1", name: "Dental" },
  department: "Claims",
  phone: "555-1234",
  email: "claims@example.com",
  fax: "",
  portal_url: "https://portal.example.com",
  ivr_steps: ["Press 1 for claims", "Press 2 for status"],
  notes: "Available M-F 8am-5pm",
  vendor_name: "",
  is_delegated: false,
  status: "published",
};

function renderWidget(search = "") {
  return render(
    <MemoryRouter initialEntries={[`/v1/widget${search}`]}>
      <WidgetPage />
    </MemoryRouter>,
  );
}

describe("WidgetPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(widgetService, "getWidgetAudiences").mockResolvedValue({
      data: mockAudiences,
    });
    vi.spyOn(widgetService, "getWidgetPlans").mockResolvedValue({
      data: mockPlans,
    });
    vi.spyOn(widgetService, "getWidgetTopics").mockResolvedValue({
      data: mockTopics,
    });
    vi.spyOn(widgetService, "getWidgetPathway").mockResolvedValue({
      data: mockPathway,
    });
    vi.spyOn(widgetService, "postWidgetEvent").mockResolvedValue({});
  });

  describe("Step 1 — Audience selection", () => {
    it("renders the heading and description", async () => {
      renderWidget();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /contact support directory/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders the step indicator", async () => {
      renderWidget();
      await waitFor(() =>
        expect(
          screen.getByRole("navigation", { name: /progress/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders audience options as buttons", async () => {
      renderWidget();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /employer/i }),
        ).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("button", { name: /individual/i }),
      ).toBeInTheDocument();
    });

    it("shows audience description when present", async () => {
      renderWidget();
      await waitFor(() =>
        expect(screen.getByText("Employer group")).toBeInTheDocument(),
      );
    });

    it("shows error when audience load fails", async () => {
      vi.spyOn(widgetService, "getWidgetAudiences").mockRejectedValue(
        new Error(),
      );
      renderWidget();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    });
  });

  describe("Step 2 — Plan selection", () => {
    it("advances to step 2 after selecting an audience", async () => {
      const user = userEvent.setup();
      renderWidget();

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /employer/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /employer/i }));

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /which plan/i }),
        ).toBeInTheDocument(),
      );
    });

    it("calls getWidgetPlans with the selected audience id", async () => {
      const user = userEvent.setup();
      renderWidget();

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /employer/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /employer/i }));

      await waitFor(() =>
        expect(widgetService.getWidgetPlans).toHaveBeenCalledWith("a1"),
      );
    });

    it("renders plan options", async () => {
      const user = userEvent.setup();
      renderWidget();

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /employer/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /employer/i }));

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /hmo/i }),
        ).toBeInTheDocument(),
      );
      expect(screen.getByRole("button", { name: /ppo/i })).toBeInTheDocument();
    });

    it("shows the selected audience as context above the list", async () => {
      const user = userEvent.setup();
      renderWidget();

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /employer/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /employer/i }));

      await waitFor(() =>
        expect(screen.getByText(/employer/i)).toBeInTheDocument(),
      );
    });

    it("goes back to step 1 when Back is clicked on step 2", async () => {
      const user = userEvent.setup();
      renderWidget();

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /employer/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /employer/i }));

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /← back/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /← back/i }));

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /who are you/i }),
        ).toBeInTheDocument(),
      );
    });
  });

  describe("Step 3 — Topic selection", () => {
    async function goToStep3(user) {
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /employer/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /employer/i }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /hmo/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /hmo/i }));
    }

    it("advances to step 3 after selecting a plan", async () => {
      const user = userEvent.setup();
      renderWidget();
      await goToStep3(user);

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /what do you need help with/i }),
        ).toBeInTheDocument(),
      );
    });

    it("calls getWidgetTopics with the selected audience and plan ids", async () => {
      const user = userEvent.setup();
      renderWidget();
      await goToStep3(user);

      await waitFor(() =>
        expect(widgetService.getWidgetTopics).toHaveBeenCalledWith("a1", "p1"),
      );
    });

    it("renders topic options", async () => {
      const user = userEvent.setup();
      renderWidget();
      await goToStep3(user);

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /dental/i }),
        ).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("button", { name: /vision/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Step 4 — Result", () => {
    async function goToResult(user) {
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /employer/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /employer/i }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /hmo/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /hmo/i }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /dental/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /dental/i }));
    }

    it("shows the result heading", async () => {
      const user = userEvent.setup();
      renderWidget();
      await goToResult(user);

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /here.*s your contact/i }),
        ).toBeInTheDocument(),
      );
    });

    it("displays the phone number", async () => {
      const user = userEvent.setup();
      renderWidget();
      await goToResult(user);

      await waitFor(() =>
        expect(screen.getByText("555-1234")).toBeInTheDocument(),
      );
    });

    it("displays the email address", async () => {
      const user = userEvent.setup();
      renderWidget();
      await goToResult(user);

      await waitFor(() =>
        expect(screen.getByText("claims@example.com")).toBeInTheDocument(),
      );
    });

    it("renders portal URL as a link", async () => {
      const user = userEvent.setup();
      renderWidget();
      await goToResult(user);

      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /https:\/\/portal\.example\.com/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders IVR steps as an ordered list", async () => {
      const user = userEvent.setup();
      renderWidget();
      await goToResult(user);

      await waitFor(() =>
        expect(screen.getByText("Press 1 for claims")).toBeInTheDocument(),
      );
      expect(screen.getByText("Press 2 for status")).toBeInTheDocument();
    });

    it("calls postWidgetEvent after displaying the result", async () => {
      const user = userEvent.setup();
      renderWidget();
      await goToResult(user);

      await waitFor(() =>
        expect(widgetService.postWidgetEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            pathway_id: "pw1",
            audience_id: "a1",
            plan_id: "p1",
            topic_id: "t1",
          }),
        ),
      );
    });

    it("resets to step 1 when Start over is clicked", async () => {
      const user = userEvent.setup();
      renderWidget();
      await goToResult(user);

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /start over/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /start over/i }));

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /who are you/i }),
        ).toBeInTheDocument(),
      );
    });

    it("shows a warning when no pathway is found", async () => {
      vi.spyOn(widgetService, "getWidgetPathway").mockRejectedValue(
        new Error(),
      );
      const user = userEvent.setup();
      renderWidget();

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /employer/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /employer/i }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /hmo/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /hmo/i }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /dental/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /dental/i }));

      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    });
  });
});
