import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import PathwayFormPage from "./PathwayFormPage";
import * as pathwayService from "../../../services/pathwayService";
import * as audienceService from "../../../services/audienceService";
import * as planService from "../../../services/planService";
import * as topicService from "../../../services/topicService";

const mockAudiences = [
  { _id: "a1", name: "Employer", is_active: true },
  { _id: "a2", name: "Individual", is_active: true },
];
const mockPlans = [
  { _id: "p1", name: "HMO", is_active: true },
  { _id: "p2", name: "PPO", is_active: true },
];
const mockTopics = [
  { _id: "t1", name: "Dental", is_active: true },
  { _id: "t2", name: "Vision", is_active: true },
];
const mockPathway = {
  _id: "pw1",
  audience_id: { _id: "a1", name: "Employer" },
  plan_id: { _id: "p1", name: "HMO" },
  topic_id: { _id: "t1", name: "Dental" },
  department: "Claims",
  phone: "555-1234",
  ivr_steps: [],
  portal_url: "",
  email: "",
  fax: "",
  notes: "",
  is_delegated: false,
  vendor_name: "",
  status: "draft",
};

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={["/admin/pathways/new"]}>
      <Routes>
        <Route path="/admin/pathways/new" element={<PathwayFormPage />} />
        <Route path="/admin/pathways" element={<div>Pathways List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={["/admin/pathways/pw1/edit"]}>
      <Routes>
        <Route path="/admin/pathways/:id/edit" element={<PathwayFormPage />} />
        <Route path="/admin/pathways" element={<div>Pathways List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PathwayFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(audienceService, "getAudiences").mockResolvedValue({
      data: mockAudiences,
    });
    vi.spyOn(planService, "getPlans").mockResolvedValue({ data: mockPlans });
    vi.spyOn(topicService, "getTopics").mockResolvedValue({ data: mockTopics });
  });

  describe("Create mode", () => {
    it("renders the New Pathway heading", async () => {
      renderCreate();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /new pathway/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders audience, plan, and topic selects", async () => {
      renderCreate();
      await waitFor(() => {
        expect(screen.getByLabelText(/audience/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/plan/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/topic/i)).toBeInTheDocument();
      });
    });

    it("renders contact detail fields", async () => {
      renderCreate();
      await waitFor(() => {
        expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
      });
    });

    it("renders Create Pathway submit button", async () => {
      renderCreate();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /create pathway/i }),
        ).toBeInTheDocument(),
      );
    });

    it("populates audience options from service", async () => {
      renderCreate();
      await waitFor(() =>
        expect(
          screen.getByRole("option", { name: "Employer" }),
        ).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("option", { name: "Individual" }),
      ).toBeInTheDocument();
    });

    it("shows validation error when audience not selected", async () => {
      const user = userEvent.setup();
      renderCreate();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /create pathway/i }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /create pathway/i }));

      expect(screen.getByText(/audience is required/i)).toBeInTheDocument();
    });

    it("shows validation error when plan not selected", async () => {
      const user = userEvent.setup();
      renderCreate();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /create pathway/i }),
        ).toBeInTheDocument(),
      );

      await user.selectOptions(screen.getByLabelText(/audience/i), "a1");
      await user.click(screen.getByRole("button", { name: /create pathway/i }));

      expect(screen.getByText(/plan is required/i)).toBeInTheDocument();
    });

    it("shows validation error when topic not selected", async () => {
      const user = userEvent.setup();
      renderCreate();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /create pathway/i }),
        ).toBeInTheDocument(),
      );

      await user.selectOptions(screen.getByLabelText(/audience/i), "a1");
      await user.selectOptions(screen.getByLabelText(/plan/i), "p1");
      await user.click(screen.getByRole("button", { name: /create pathway/i }));

      expect(screen.getByText(/topic is required/i)).toBeInTheDocument();
    });

    it("calls createPathway with form values on submit", async () => {
      vi.spyOn(pathwayService, "createPathway").mockResolvedValue({
        data: mockPathway,
      });
      const user = userEvent.setup();
      renderCreate();

      await waitFor(() =>
        expect(screen.getByLabelText(/audience/i)).toBeInTheDocument(),
      );

      await user.selectOptions(screen.getByLabelText(/audience/i), "a1");
      await user.selectOptions(screen.getByLabelText(/plan/i), "p1");
      await user.selectOptions(screen.getByLabelText(/topic/i), "t1");
      await user.click(screen.getByRole("button", { name: /create pathway/i }));

      await waitFor(() =>
        expect(pathwayService.createPathway).toHaveBeenCalledWith(
          expect.objectContaining({
            audience_id: "a1",
            plan_id: "p1",
            topic_id: "t1",
          }),
        ),
      );
    });

    it("navigates to the pathways list on successful create", async () => {
      vi.spyOn(pathwayService, "createPathway").mockResolvedValue({
        data: mockPathway,
      });
      const user = userEvent.setup();
      renderCreate();

      await waitFor(() =>
        expect(screen.getByLabelText(/audience/i)).toBeInTheDocument(),
      );

      await user.selectOptions(screen.getByLabelText(/audience/i), "a1");
      await user.selectOptions(screen.getByLabelText(/plan/i), "p1");
      await user.selectOptions(screen.getByLabelText(/topic/i), "t1");
      await user.click(screen.getByRole("button", { name: /create pathway/i }));

      await waitFor(() =>
        expect(screen.getByText("Pathways List")).toBeInTheDocument(),
      );
    });

    it("shows API error message on failed create", async () => {
      vi.spyOn(pathwayService, "createPathway").mockRejectedValue({
        response: {
          data: { message: "A pathway for this combination already exists" },
        },
      });
      const user = userEvent.setup();
      renderCreate();

      await waitFor(() =>
        expect(screen.getByLabelText(/audience/i)).toBeInTheDocument(),
      );

      await user.selectOptions(screen.getByLabelText(/audience/i), "a1");
      await user.selectOptions(screen.getByLabelText(/plan/i), "p1");
      await user.selectOptions(screen.getByLabelText(/topic/i), "t1");
      await user.click(screen.getByRole("button", { name: /create pathway/i }));

      await waitFor(() =>
        expect(
          screen.getByText(/a pathway for this combination already exists/i),
        ).toBeInTheDocument(),
      );
    });
  });

  describe("Edit mode", () => {
    beforeEach(() => {
      vi.spyOn(pathwayService, "getPathway").mockResolvedValue({
        data: mockPathway,
      });
    });

    it("renders the Edit Pathway heading", async () => {
      renderEdit();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /edit pathway/i }),
        ).toBeInTheDocument(),
      );
    });

    it("pre-populates selects from loaded pathway", async () => {
      renderEdit();
      await waitFor(() => {
        expect(screen.getByLabelText(/audience/i)).toHaveValue("a1");
        expect(screen.getByLabelText(/plan/i)).toHaveValue("p1");
        expect(screen.getByLabelText(/topic/i)).toHaveValue("t1");
      });
    });

    it("pre-populates contact fields from loaded pathway", async () => {
      renderEdit();
      await waitFor(() =>
        expect(screen.getByLabelText(/department/i)).toHaveValue("Claims"),
      );
      expect(screen.getByLabelText(/phone/i)).toHaveValue("555-1234");
    });

    it("calls updatePathway on submit", async () => {
      vi.spyOn(pathwayService, "updatePathway").mockResolvedValue({
        data: mockPathway,
      });
      const user = userEvent.setup();
      renderEdit();

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /save pathway/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /save pathway/i }));

      await waitFor(() =>
        expect(pathwayService.updatePathway).toHaveBeenCalledWith(
          "pw1",
          expect.objectContaining({ audience_id: "a1" }),
        ),
      );
    });

    it("navigates to pathways list on successful update", async () => {
      vi.spyOn(pathwayService, "updatePathway").mockResolvedValue({
        data: mockPathway,
      });
      const user = userEvent.setup();
      renderEdit();

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /save pathway/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /save pathway/i }));

      await waitFor(() =>
        expect(screen.getByText("Pathways List")).toBeInTheDocument(),
      );
    });
  });

  describe("IVR Steps", () => {
    it("adds an IVR step input when Add IVR Step is clicked", async () => {
      const user = userEvent.setup();
      renderCreate();

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /add ivr step/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /add ivr step/i }));

      expect(
        screen.getByRole("textbox", { name: /ivr step 1/i }),
      ).toBeInTheDocument();
    });

    it("removes an IVR step when Remove button is clicked", async () => {
      const user = userEvent.setup();
      renderCreate();

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /add ivr step/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /add ivr step/i }));
      expect(
        screen.getByRole("textbox", { name: /ivr step 1/i }),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: /remove ivr step 1/i }),
      );
      expect(screen.queryByRole("textbox", { name: /ivr step 1/i })).toBeNull();
    });
  });

  describe("Delegation", () => {
    it("shows vendor name field when Delegated to Vendor is checked", async () => {
      const user = userEvent.setup();
      renderCreate();

      await waitFor(() =>
        expect(
          screen.getByLabelText(/delegated to vendor/i),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByLabelText(/delegated to vendor/i));

      expect(screen.getByLabelText(/vendor name/i)).toBeInTheDocument();
    });

    it("hides vendor name field when Delegated to Vendor is unchecked", async () => {
      const user = userEvent.setup();
      renderCreate();

      await waitFor(() =>
        expect(
          screen.getByLabelText(/delegated to vendor/i),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByLabelText(/delegated to vendor/i));
      expect(screen.getByLabelText(/vendor name/i)).toBeInTheDocument();

      await user.click(screen.getByLabelText(/delegated to vendor/i));
      expect(screen.queryByLabelText(/vendor name/i)).toBeNull();
    });

    it("shows vendor name validation error when delegated but vendor name empty", async () => {
      const user = userEvent.setup();
      renderCreate();

      await waitFor(() =>
        expect(
          screen.getByLabelText(/delegated to vendor/i),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByLabelText(/delegated to vendor/i));
      await user.selectOptions(screen.getByLabelText(/audience/i), "a1");
      await user.selectOptions(screen.getByLabelText(/plan/i), "p1");
      await user.selectOptions(screen.getByLabelText(/topic/i), "t1");
      await user.click(screen.getByRole("button", { name: /create pathway/i }));

      expect(
        screen.getByText(/vendor name is required when delegated/i),
      ).toBeInTheDocument();
    });
  });
});
