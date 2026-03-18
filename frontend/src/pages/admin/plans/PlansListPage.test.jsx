import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import PlansListPage from "./PlansListPage";
import * as planService from "../../../services/planService";
import { AuthContext } from "../../../context/AuthContext";

const mockPlans = [
  {
    _id: "p1",
    name: "HMO",
    slug: "hmo",
    sort_order: 0,
    is_active: true,
    updatedAt: "2026-03-10T12:00:00.000Z",
  },
  {
    _id: "p2",
    name: "PPO",
    slug: "ppo",
    sort_order: 1,
    is_active: false,
    updatedAt: "2026-03-09T08:00:00.000Z",
  },
];

function renderList(userRole = "admin") {
  return render(
    <AuthContext.Provider
      value={{
        user: { _id: "u1", user_role: userRole },
        setUser: vi.fn(),
        loading: false,
      }}
    >
      <MemoryRouter>
        <PlansListPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("PlansListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(planService, "getPlans").mockResolvedValue({ data: mockPlans });
  });

  describe("Layout", () => {
    it("renders the Plans heading", async () => {
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /plans/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders the New Plan button for admin", async () => {
      renderList("admin");
      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /new plan/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders the New Plan button for super user", async () => {
      renderList("super user");
      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /new plan/i }),
        ).toBeInTheDocument(),
      );
    });

    it("hides the New Plan button for user role", async () => {
      renderList("user");
      await waitFor(() =>
        expect(screen.queryByRole("link", { name: /new plan/i })).toBeNull(),
      );
    });

    it("renders a search input", async () => {
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("searchbox", { name: /search plans/i }),
        ).toBeInTheDocument(),
      );
    });
  });

  describe("Data loading", () => {
    it("renders plan names in the table", async () => {
      renderList();
      await waitFor(() => expect(screen.getByText("HMO")).toBeInTheDocument());
      // PPO is inactive and hidden by default
      expect(screen.queryByText("PPO")).toBeNull();
    });

    it("shows Active badge for active plans", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Active")).toBeInTheDocument(),
      );
    });

    it("shows Inactive badge for inactive plans", async () => {
      const user = userEvent.setup();
      renderList();
      await waitFor(() => expect(screen.getByText("HMO")).toBeInTheDocument());
      await user.click(
        screen.getByRole("checkbox", { name: /show inactive/i }),
      );
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("shows Edit links for each row", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getAllByRole("link", { name: /edit/i })).toHaveLength(1),
      );
    });

    it("shows Deactivate button for active plan (admin)", async () => {
      renderList("admin");
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /deactivate/i }),
        ).toBeInTheDocument(),
      );
    });

    it("shows Activate button for inactive plan (admin)", async () => {
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() => expect(screen.getByText("HMO")).toBeInTheDocument());
      await user.click(
        screen.getByRole("checkbox", { name: /show inactive/i }),
      );
      expect(
        screen.getByRole("button", { name: "Activate" }),
      ).toBeInTheDocument();
    });

    it("shows Delete buttons for admin", async () => {
      renderList("admin");
      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(
          1,
        ),
      );
    });

    it("hides Deactivate and Delete buttons for user role", async () => {
      renderList("user");
      await waitFor(() => expect(screen.getByText("HMO")).toBeInTheDocument());
      expect(screen.queryByRole("button", { name: /deactivate/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    });

    it("shows error alert when load fails", async () => {
      vi.spyOn(planService, "getPlans").mockRejectedValue(new Error("fail"));
      renderList();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    });
  });

  describe("Search", () => {
    it("filters rows by name", async () => {
      const user = userEvent.setup();
      renderList();
      await waitFor(() => expect(screen.getByText("HMO")).toBeInTheDocument());

      await user.click(
        screen.getByRole("checkbox", { name: /show inactive/i }),
      );
      await user.type(screen.getByRole("searchbox"), "ppo");

      expect(screen.queryByText("HMO")).toBeNull();
      expect(screen.getByText("PPO")).toBeInTheDocument();
    });

    it("shows no-results message when search matches nothing", async () => {
      const user = userEvent.setup();
      renderList();
      await waitFor(() => expect(screen.getByText("HMO")).toBeInTheDocument());

      await user.type(screen.getByRole("searchbox"), "zzznomatch");

      expect(screen.getByText(/no plans found/i)).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("opens confirm dialog when Delete is clicked", async () => {
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(
          1,
        ),
      );

      await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it("calls deletePlan and removes row on confirm", async () => {
      vi.spyOn(planService, "deletePlan").mockResolvedValue({});
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(
          1,
        ),
      );

      await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);
      await user.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() =>
        expect(planService.deletePlan).toHaveBeenCalledWith("p1"),
      );
      expect(screen.queryByText("HMO")).toBeNull();
    });

    it("cancels delete dialog without calling deletePlan", async () => {
      vi.spyOn(planService, "deletePlan").mockResolvedValue({});
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(
          1,
        ),
      );

      await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(planService.deletePlan).not.toHaveBeenCalled();
      expect(screen.getByText("HMO")).toBeInTheDocument();
    });

    it("calls updatePlan with is_active:false when Deactivate is clicked", async () => {
      vi.spyOn(planService, "updatePlan").mockResolvedValue({
        data: { ...mockPlans[0], is_active: false },
      });
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /deactivate/i }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /deactivate/i }));

      await waitFor(() =>
        expect(planService.updatePlan).toHaveBeenCalledWith("p1", {
          is_active: false,
        }),
      );
    });

    it("calls updatePlan with is_active:true when Activate is clicked", async () => {
      vi.spyOn(planService, "updatePlan").mockResolvedValue({
        data: { ...mockPlans[1], is_active: true },
      });
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() => expect(screen.getByText("HMO")).toBeInTheDocument());
      await user.click(
        screen.getByRole("checkbox", { name: /show inactive/i }),
      );

      await user.click(screen.getByRole("button", { name: "Activate" }));

      await waitFor(() =>
        expect(planService.updatePlan).toHaveBeenCalledWith("p2", {
          is_active: true,
        }),
      );
    });

    it("shows error alert when delete fails", async () => {
      vi.spyOn(planService, "deletePlan").mockRejectedValue(new Error("fail"));
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(
          1,
        ),
      );

      await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);
      await user.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    });
  });
});
