import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import PlanFormPage from "./PlanFormPage";
import * as planService from "../../../services/planService";

const mockPlan = {
  _id: "p1",
  name: "HMO",
  description: "Health Maintenance Organization",
  is_active: true,
  sort_order: 0,
};

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={["/admin/plans/new"]}>
      <Routes>
        <Route path="/admin/plans/new" element={<PlanFormPage />} />
        <Route path="/admin/plans" element={<div>Plans List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={["/admin/plans/p1/edit"]}>
      <Routes>
        <Route path="/admin/plans/:id/edit" element={<PlanFormPage />} />
        <Route path="/admin/plans" element={<div>Plans List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PlanFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create mode", () => {
    it("renders the New Plan heading", () => {
      renderCreate();
      expect(
        screen.getByRole("heading", { name: /new plan/i }),
      ).toBeInTheDocument();
    });

    it("renders name, description, sort order, and active fields", () => {
      renderCreate();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sort order/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/active/i)).toBeInTheDocument();
    });

    it("renders Create Plan submit button", () => {
      renderCreate();
      expect(
        screen.getByRole("button", { name: /create plan/i }),
      ).toBeInTheDocument();
    });

    it("shows validation error when name is empty on submit", async () => {
      const user = userEvent.setup();
      renderCreate();

      await user.click(screen.getByRole("button", { name: /create plan/i }));

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    it("calls createPlan with form values on submit", async () => {
      vi.spyOn(planService, "createPlan").mockResolvedValue({
        data: { ...mockPlan },
      });
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/name/i), "HMO");
      await user.type(
        screen.getByLabelText(/description/i),
        "Health Maintenance Organization",
      );
      await user.click(screen.getByRole("button", { name: /create plan/i }));

      await waitFor(() =>
        expect(planService.createPlan).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "HMO",
            description: "Health Maintenance Organization",
          }),
        ),
      );
    });

    it("navigates to the plans list on successful create", async () => {
      vi.spyOn(planService, "createPlan").mockResolvedValue({
        data: mockPlan,
      });
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/name/i), "HMO");
      await user.click(screen.getByRole("button", { name: /create plan/i }));

      await waitFor(() =>
        expect(screen.getByText("Plans List")).toBeInTheDocument(),
      );
    });

    it("shows API error message on failed create", async () => {
      vi.spyOn(planService, "createPlan").mockRejectedValue({
        response: {
          data: { message: "A plan with that name already exists" },
        },
      });
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/name/i), "HMO");
      await user.click(screen.getByRole("button", { name: /create plan/i }));

      await waitFor(() =>
        expect(
          screen.getByText(/a plan with that name already exists/i),
        ).toBeInTheDocument(),
      );
    });

    it("disables submit button while submitting", async () => {
      vi.spyOn(planService, "createPlan").mockReturnValue(
        new Promise(() => {}),
      );
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/name/i), "HMO");
      await user.click(screen.getByRole("button", { name: /create plan/i }));

      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });
  });

  describe("Edit mode", () => {
    beforeEach(() => {
      vi.spyOn(planService, "getPlan").mockResolvedValue({ data: mockPlan });
    });

    it("renders the Edit Plan heading", async () => {
      renderEdit();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /edit plan/i }),
        ).toBeInTheDocument(),
      );
    });

    it("pre-fills the form with loaded data", async () => {
      renderEdit();
      await waitFor(() =>
        expect(screen.getByLabelText(/name/i)).toHaveValue("HMO"),
      );
      expect(screen.getByLabelText(/description/i)).toHaveValue(
        "Health Maintenance Organization",
      );
      expect(screen.getByLabelText(/active/i)).toBeChecked();
    });

    it("renders Save Changes submit button", async () => {
      renderEdit();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /save changes/i }),
        ).toBeInTheDocument(),
      );
    });

    it("calls updatePlan with updated values on submit", async () => {
      vi.spyOn(planService, "updatePlan").mockResolvedValue({
        data: mockPlan,
      });
      const user = userEvent.setup();
      renderEdit();

      await waitFor(() =>
        expect(screen.getByLabelText(/name/i)).toHaveValue("HMO"),
      );

      await user.clear(screen.getByLabelText(/name/i));
      await user.type(screen.getByLabelText(/name/i), "Updated HMO");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(planService.updatePlan).toHaveBeenCalledWith(
          "p1",
          expect.objectContaining({ name: "Updated HMO" }),
        ),
      );
    });

    it("navigates to plans list on successful save", async () => {
      vi.spyOn(planService, "updatePlan").mockResolvedValue({
        data: mockPlan,
      });
      const user = userEvent.setup();
      renderEdit();

      await waitFor(() =>
        expect(screen.getByLabelText(/name/i)).toHaveValue("HMO"),
      );
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(screen.getByText("Plans List")).toBeInTheDocument(),
      );
    });

    it("shows error alert when load fails", async () => {
      vi.spyOn(planService, "getPlan").mockRejectedValue(new Error("fail"));
      renderEdit();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    });
  });
});
