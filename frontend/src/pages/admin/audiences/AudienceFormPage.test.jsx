import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import AudienceFormPage from "./AudienceFormPage";
import * as audienceService from "../../../services/audienceService";

const mockAudience = {
  _id: "a1",
  name: "Members",
  description: "Health plan members",
  is_active: true,
  sort_order: 0,
};

// Render in create mode
function renderCreate() {
  return render(
    <MemoryRouter initialEntries={["/admin/audiences/new"]}>
      <Routes>
        <Route path="/admin/audiences/new" element={<AudienceFormPage />} />
        <Route path="/admin/audiences" element={<div>Audiences List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// Render in edit mode
function renderEdit() {
  return render(
    <MemoryRouter initialEntries={["/admin/audiences/a1/edit"]}>
      <Routes>
        <Route
          path="/admin/audiences/:id/edit"
          element={<AudienceFormPage />}
        />
        <Route path="/admin/audiences" element={<div>Audiences List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AudienceFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create mode", () => {
    it("renders the New Audience heading", () => {
      renderCreate();
      expect(
        screen.getByRole("heading", { name: /new audience/i }),
      ).toBeInTheDocument();
    });

    it("renders name, description, sort order, and active fields", () => {
      renderCreate();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sort order/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/active/i)).toBeInTheDocument();
    });

    it("renders Create Audience submit button", () => {
      renderCreate();
      expect(
        screen.getByRole("button", { name: /create audience/i }),
      ).toBeInTheDocument();
    });

    it("shows validation error when name is empty on submit", async () => {
      const user = userEvent.setup();
      renderCreate();

      await user.click(
        screen.getByRole("button", { name: /create audience/i }),
      );

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    it("calls createAudience with form values on submit", async () => {
      vi.spyOn(audienceService, "createAudience").mockResolvedValue({
        data: { ...mockAudience },
      });
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/name/i), "Members");
      await user.type(
        screen.getByLabelText(/description/i),
        "Health plan members",
      );
      await user.click(
        screen.getByRole("button", { name: /create audience/i }),
      );

      await waitFor(() =>
        expect(audienceService.createAudience).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Members",
            description: "Health plan members",
          }),
        ),
      );
    });

    it("navigates to the audiences list on successful create", async () => {
      vi.spyOn(audienceService, "createAudience").mockResolvedValue({
        data: mockAudience,
      });
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/name/i), "Members");
      await user.click(
        screen.getByRole("button", { name: /create audience/i }),
      );

      await waitFor(() =>
        expect(screen.getByText("Audiences List")).toBeInTheDocument(),
      );
    });

    it("shows API error message on failed create", async () => {
      vi.spyOn(audienceService, "createAudience").mockRejectedValue({
        response: {
          data: { message: "An audience with that name already exists" },
        },
      });
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/name/i), "Members");
      await user.click(
        screen.getByRole("button", { name: /create audience/i }),
      );

      await waitFor(() =>
        expect(
          screen.getByText(/an audience with that name already exists/i),
        ).toBeInTheDocument(),
      );
    });

    it("disables submit button while submitting", async () => {
      vi.spyOn(audienceService, "createAudience").mockReturnValue(
        new Promise(() => {}),
      );
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/name/i), "Members");
      await user.click(
        screen.getByRole("button", { name: /create audience/i }),
      );

      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });
  });

  describe("Edit mode", () => {
    beforeEach(() => {
      vi.spyOn(audienceService, "getAudience").mockResolvedValue({
        data: mockAudience,
      });
    });

    it("renders the Edit Audience heading", async () => {
      renderEdit();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /edit audience/i }),
        ).toBeInTheDocument(),
      );
    });

    it("pre-fills the form with loaded data", async () => {
      renderEdit();
      await waitFor(() =>
        expect(screen.getByLabelText(/name/i)).toHaveValue("Members"),
      );
      expect(screen.getByLabelText(/description/i)).toHaveValue(
        "Health plan members",
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

    it("calls updateAudience with updated values on submit", async () => {
      vi.spyOn(audienceService, "updateAudience").mockResolvedValue({
        data: mockAudience,
      });
      const user = userEvent.setup();
      renderEdit();

      await waitFor(() =>
        expect(screen.getByLabelText(/name/i)).toHaveValue("Members"),
      );

      await user.clear(screen.getByLabelText(/name/i));
      await user.type(screen.getByLabelText(/name/i), "Updated Members");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(audienceService.updateAudience).toHaveBeenCalledWith(
          "a1",
          expect.objectContaining({ name: "Updated Members" }),
        ),
      );
    });

    it("navigates to audiences list on successful save", async () => {
      vi.spyOn(audienceService, "updateAudience").mockResolvedValue({
        data: mockAudience,
      });
      const user = userEvent.setup();
      renderEdit();

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /save changes/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(screen.getByText("Audiences List")).toBeInTheDocument(),
      );
    });

    it("shows error alert when load fails", async () => {
      vi.spyOn(audienceService, "getAudience").mockRejectedValue(
        new Error("fail"),
      );
      renderEdit();

      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    });
  });
});
