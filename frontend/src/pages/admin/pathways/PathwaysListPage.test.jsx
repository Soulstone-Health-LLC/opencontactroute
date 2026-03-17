import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import PathwaysListPage from "./PathwaysListPage";
import * as pathwayService from "../../../services/pathwayService";
import { AuthContext } from "../../../context/AuthContext";

const mockPathways = [
  {
    _id: "pw1",
    audience_id: { _id: "a1", name: "Employer" },
    plan_id: { _id: "p1", name: "HMO" },
    topic_id: { _id: "t1", name: "Dental" },
    department: "Claims",
    status: "published",
    updatedAt: "2026-03-10T12:00:00.000Z",
  },
  {
    _id: "pw2",
    audience_id: { _id: "a2", name: "Individual" },
    plan_id: { _id: "p2", name: "PPO" },
    topic_id: { _id: "t2", name: "Vision" },
    department: "Customer Service",
    status: "draft",
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
        <PathwaysListPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("PathwaysListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(pathwayService, "getPathways").mockResolvedValue({
      data: mockPathways,
    });
  });

  describe("Layout", () => {
    it("renders the Contact Pathways heading", async () => {
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /contact pathways/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders the New Pathway button for admin", async () => {
      renderList("admin");
      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /new pathway/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders the New Pathway button for super user", async () => {
      renderList("super user");
      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /new pathway/i }),
        ).toBeInTheDocument(),
      );
    });

    it("hides the New Pathway button for user role", async () => {
      renderList("user");
      await waitFor(() =>
        expect(screen.queryByRole("link", { name: /new pathway/i })).toBeNull(),
      );
    });

    it("renders a search input", async () => {
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("searchbox", { name: /search pathways/i }),
        ).toBeInTheDocument(),
      );
    });
  });

  describe("Data loading", () => {
    it("renders audience names in the table", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Employer")).toBeInTheDocument(),
      );
      expect(screen.getByText("Individual")).toBeInTheDocument();
    });

    it("renders plan names in the table", async () => {
      renderList();
      await waitFor(() => expect(screen.getByText("HMO")).toBeInTheDocument());
      expect(screen.getByText("PPO")).toBeInTheDocument();
    });

    it("renders topic names in the table", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Dental")).toBeInTheDocument(),
      );
      expect(screen.getByText("Vision")).toBeInTheDocument();
    });

    it("shows Published badge for published pathways", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Published")).toBeInTheDocument(),
      );
    });

    it("shows Draft badge for draft pathways", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Draft")).toBeInTheDocument(),
      );
    });

    it("shows Edit links for each row", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getAllByRole("link", { name: /edit/i })).toHaveLength(2),
      );
    });

    it("shows empty state when no pathways exist", async () => {
      vi.spyOn(pathwayService, "getPathways").mockResolvedValue({ data: [] });
      renderList();
      await waitFor(() =>
        expect(screen.getByText(/no pathways found/i)).toBeInTheDocument(),
      );
    });

    it("shows an error alert when load fails", async () => {
      vi.spyOn(pathwayService, "getPathways").mockRejectedValue(new Error());
      renderList();
      await waitFor(() =>
        expect(
          screen.getByText(/failed to load pathways/i),
        ).toBeInTheDocument(),
      );
    });
  });

  describe("Actions — admin only", () => {
    it("shows Unpublish button for published pathways", async () => {
      renderList("admin");
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /unpublish/i }),
        ).toBeInTheDocument(),
      );
    });

    it("shows Publish button for draft pathways", async () => {
      renderList("admin");
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /^publish$/i }),
        ).toBeInTheDocument(),
      );
    });

    it("hides Publish/Unpublish buttons for user role", async () => {
      renderList("user");
      await waitFor(() => expect(screen.queryByText("Unpublish")).toBeNull());
      expect(screen.queryByText("Publish")).toBeNull();
    });

    it("calls publishPathway and shows toast on Publish click", async () => {
      const published = { ...mockPathways[1], status: "published" };
      vi.spyOn(pathwayService, "publishPathway").mockResolvedValue({
        data: published,
      });
      const user = userEvent.setup();
      renderList("admin");

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /^publish$/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /^publish$/i }));

      await waitFor(() =>
        expect(pathwayService.publishPathway).toHaveBeenCalledWith("pw2"),
      );
    });

    it("calls unpublishPathway and shows toast on Unpublish click", async () => {
      const unpublished = { ...mockPathways[0], status: "draft" };
      vi.spyOn(pathwayService, "unpublishPathway").mockResolvedValue({
        data: unpublished,
      });
      const user = userEvent.setup();
      renderList("admin");

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /unpublish/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /unpublish/i }));

      await waitFor(() =>
        expect(pathwayService.unpublishPathway).toHaveBeenCalledWith("pw1"),
      );
    });

    it("opens confirm dialog on Delete click", async () => {
      const user = userEvent.setup();
      renderList("admin");

      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(
          2,
        ),
      );
      await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);

      expect(screen.getByText(/delete pathway/i)).toBeInTheDocument();
    });

    it("calls deletePathway when delete is confirmed", async () => {
      vi.spyOn(pathwayService, "deletePathway").mockResolvedValue({});
      const user = userEvent.setup();
      renderList("admin");

      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(
          2,
        ),
      );
      await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);
      await user.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() =>
        expect(pathwayService.deletePathway).toHaveBeenCalledWith("pw1"),
      );
    });

    it("shows action error when publish fails", async () => {
      vi.spyOn(pathwayService, "publishPathway").mockRejectedValue(new Error());
      const user = userEvent.setup();
      renderList("admin");

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /^publish$/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /^publish$/i }));

      await waitFor(() =>
        expect(
          screen.getByText(/failed to publish pathway/i),
        ).toBeInTheDocument(),
      );
    });
  });

  describe("Search", () => {
    it("filters rows by audience name", async () => {
      const user = userEvent.setup();
      renderList();

      await waitFor(() =>
        expect(screen.getByText("Employer")).toBeInTheDocument(),
      );

      await user.type(
        screen.getByRole("searchbox", { name: /search pathways/i }),
        "Employer",
      );

      expect(screen.getByText("Employer")).toBeInTheDocument();
      expect(screen.queryByText("Individual")).toBeNull();
    });

    it("filters rows by plan name", async () => {
      const user = userEvent.setup();
      renderList();

      await waitFor(() => expect(screen.getByText("HMO")).toBeInTheDocument());

      await user.type(
        screen.getByRole("searchbox", { name: /search pathways/i }),
        "PPO",
      );

      expect(screen.queryByText("HMO")).toBeNull();
      expect(screen.getByText("PPO")).toBeInTheDocument();
    });

    it("filters rows by topic name", async () => {
      const user = userEvent.setup();
      renderList();

      await waitFor(() =>
        expect(screen.getByText("Dental")).toBeInTheDocument(),
      );

      await user.type(
        screen.getByRole("searchbox", { name: /search pathways/i }),
        "Vision",
      );

      expect(screen.queryByText("Dental")).toBeNull();
      expect(screen.getByText("Vision")).toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    it("renders sortable column header buttons for Audience, Plan, Topic, Department", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Employer")).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("button", { name: /audience/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /plan/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /topic/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /department/i }),
      ).toBeInTheDocument();
    });

    it("sorts rows ascending by audience name on first click", async () => {
      const user = userEvent.setup();
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Employer")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /audience/i }));

      const rows = screen.getAllByRole("row").slice(1); // skip header
      expect(rows[0]).toHaveTextContent("Employer");
      expect(rows[1]).toHaveTextContent("Individual");
    });

    it("sorts rows descending by audience name on second click", async () => {
      const user = userEvent.setup();
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Employer")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /audience/i }));
      await user.click(screen.getByRole("button", { name: /audience/i }));

      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0]).toHaveTextContent("Individual");
      expect(rows[1]).toHaveTextContent("Employer");
    });

    it("sets aria-sort='ascending' on sorted column header", async () => {
      const user = userEvent.setup();
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Employer")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /audience/i }));

      expect(
        screen.getByRole("columnheader", { name: /audience/i }),
      ).toHaveAttribute("aria-sort", "ascending");
    });

    it("sets aria-sort='descending' on second click", async () => {
      const user = userEvent.setup();
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Employer")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /audience/i }));
      await user.click(screen.getByRole("button", { name: /audience/i }));

      expect(
        screen.getByRole("columnheader", { name: /audience/i }),
      ).toHaveAttribute("aria-sort", "descending");
    });

    it("sorts rows by department name", async () => {
      const user = userEvent.setup();
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Claims")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /department/i }));

      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0]).toHaveTextContent("Claims");
      expect(rows[1]).toHaveTextContent("Customer Service");
    });
  });
});
