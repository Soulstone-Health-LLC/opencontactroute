import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import TopicFormPage from "./TopicFormPage";
import * as topicService from "../../../services/topicService";

const mockTopic = {
  _id: "t1",
  name: "Dental",
  description: "Dental coverage topics",
  is_active: true,
  sort_order: 0,
};

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={["/admin/topics/new"]}>
      <Routes>
        <Route path="/admin/topics/new" element={<TopicFormPage />} />
        <Route path="/admin/topics" element={<div>Topics List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={["/admin/topics/t1/edit"]}>
      <Routes>
        <Route path="/admin/topics/:id/edit" element={<TopicFormPage />} />
        <Route path="/admin/topics" element={<div>Topics List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TopicFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create mode", () => {
    it("renders the New Topic heading", () => {
      renderCreate();
      expect(
        screen.getByRole("heading", { name: /new topic/i }),
      ).toBeInTheDocument();
    });

    it("renders name, description, sort order, and active fields", () => {
      renderCreate();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sort order/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/active/i)).toBeInTheDocument();
    });

    it("renders Create Topic submit button", () => {
      renderCreate();
      expect(
        screen.getByRole("button", { name: /create topic/i }),
      ).toBeInTheDocument();
    });

    it("shows validation error when name is empty on submit", async () => {
      const user = userEvent.setup();
      renderCreate();

      await user.click(screen.getByRole("button", { name: /create topic/i }));

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    it("calls createTopic with form values on submit", async () => {
      vi.spyOn(topicService, "createTopic").mockResolvedValue({
        data: { ...mockTopic },
      });
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/name/i), "Dental");
      await user.type(
        screen.getByLabelText(/description/i),
        "Dental coverage topics",
      );
      await user.click(screen.getByRole("button", { name: /create topic/i }));

      await waitFor(() =>
        expect(topicService.createTopic).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Dental",
            description: "Dental coverage topics",
          }),
        ),
      );
    });

    it("navigates to the topics list on successful create", async () => {
      vi.spyOn(topicService, "createTopic").mockResolvedValue({
        data: mockTopic,
      });
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/name/i), "Dental");
      await user.click(screen.getByRole("button", { name: /create topic/i }));

      await waitFor(() =>
        expect(screen.getByText("Topics List")).toBeInTheDocument(),
      );
    });

    it("shows API error message on failed create", async () => {
      vi.spyOn(topicService, "createTopic").mockRejectedValue({
        response: {
          data: { message: "A topic with that name already exists" },
        },
      });
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/name/i), "Dental");
      await user.click(screen.getByRole("button", { name: /create topic/i }));

      await waitFor(() =>
        expect(
          screen.getByText(/a topic with that name already exists/i),
        ).toBeInTheDocument(),
      );
    });

    it("disables submit button while submitting", async () => {
      vi.spyOn(topicService, "createTopic").mockReturnValue(
        new Promise(() => {}),
      );
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/name/i), "Dental");
      await user.click(screen.getByRole("button", { name: /create topic/i }));

      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });
  });

  describe("Edit mode", () => {
    beforeEach(() => {
      vi.spyOn(topicService, "getTopic").mockResolvedValue({ data: mockTopic });
    });

    it("renders the Edit Topic heading", async () => {
      renderEdit();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /edit topic/i }),
        ).toBeInTheDocument(),
      );
    });

    it("pre-fills the form with loaded data", async () => {
      renderEdit();
      await waitFor(() =>
        expect(screen.getByLabelText(/name/i)).toHaveValue("Dental"),
      );
      expect(screen.getByLabelText(/description/i)).toHaveValue(
        "Dental coverage topics",
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

    it("calls updateTopic with updated values on submit", async () => {
      vi.spyOn(topicService, "updateTopic").mockResolvedValue({
        data: mockTopic,
      });
      const user = userEvent.setup();
      renderEdit();

      await waitFor(() =>
        expect(screen.getByLabelText(/name/i)).toHaveValue("Dental"),
      );

      await user.clear(screen.getByLabelText(/name/i));
      await user.type(screen.getByLabelText(/name/i), "Updated Dental");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(topicService.updateTopic).toHaveBeenCalledWith(
          "t1",
          expect.objectContaining({ name: "Updated Dental" }),
        ),
      );
    });

    it("navigates to topics list on successful save", async () => {
      vi.spyOn(topicService, "updateTopic").mockResolvedValue({
        data: mockTopic,
      });
      const user = userEvent.setup();
      renderEdit();

      await waitFor(() =>
        expect(screen.getByLabelText(/name/i)).toHaveValue("Dental"),
      );
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(screen.getByText("Topics List")).toBeInTheDocument(),
      );
    });

    it("shows error alert when load fails", async () => {
      vi.spyOn(topicService, "getTopic").mockRejectedValue(new Error("fail"));
      renderEdit();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    });
  });
});
