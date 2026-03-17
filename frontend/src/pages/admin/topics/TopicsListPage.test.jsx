import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import TopicsListPage from "./TopicsListPage";
import * as topicService from "../../../services/topicService";
import { AuthContext } from "../../../context/AuthContext";

const mockTopics = [
  {
    _id: "t1",
    name: "Dental",
    slug: "dental",
    sort_order: 0,
    is_active: true,
    updatedAt: "2026-03-10T12:00:00.000Z",
  },
  {
    _id: "t2",
    name: "Vision",
    slug: "vision",
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
        <TopicsListPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("TopicsListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(topicService, "getTopics").mockResolvedValue({ data: mockTopics });
  });

  describe("Layout", () => {
    it("renders the Topics heading", async () => {
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /topics/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders the New Topic button for admin", async () => {
      renderList("admin");
      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /new topic/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders the New Topic button for super user", async () => {
      renderList("super user");
      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /new topic/i }),
        ).toBeInTheDocument(),
      );
    });

    it("hides the New Topic button for user role", async () => {
      renderList("user");
      await waitFor(() =>
        expect(screen.queryByRole("link", { name: /new topic/i })).toBeNull(),
      );
    });

    it("renders a search input", async () => {
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("searchbox", { name: /search topics/i }),
        ).toBeInTheDocument(),
      );
    });
  });

  describe("Data loading", () => {
    it("renders topic names in the table", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Dental")).toBeInTheDocument(),
      );
      expect(screen.getByText("Vision")).toBeInTheDocument();
    });

    it("shows Active badge for active topics", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Active")).toBeInTheDocument(),
      );
    });

    it("shows Inactive badge for inactive topics", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Inactive")).toBeInTheDocument(),
      );
    });

    it("shows Edit links for each row", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getAllByRole("link", { name: /edit/i })).toHaveLength(2),
      );
    });

    it("shows Deactivate button for active topic (admin)", async () => {
      renderList("admin");
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /deactivate/i }),
        ).toBeInTheDocument(),
      );
    });

    it("shows Activate button for inactive topic (admin)", async () => {
      renderList("admin");
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Activate" }),
        ).toBeInTheDocument(),
      );
    });

    it("shows Delete buttons for admin", async () => {
      renderList("admin");
      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(
          2,
        ),
      );
    });

    it("hides Deactivate and Delete buttons for user role", async () => {
      renderList("user");
      await waitFor(() =>
        expect(screen.getByText("Dental")).toBeInTheDocument(),
      );
      expect(screen.queryByRole("button", { name: /deactivate/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    });

    it("shows error alert when load fails", async () => {
      vi.spyOn(topicService, "getTopics").mockRejectedValue(new Error("fail"));
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
      await waitFor(() =>
        expect(screen.getByText("Dental")).toBeInTheDocument(),
      );

      await user.type(screen.getByRole("searchbox"), "vis");

      expect(screen.queryByText("Dental")).toBeNull();
      expect(screen.getByText("Vision")).toBeInTheDocument();
    });

    it("shows no-results message when search matches nothing", async () => {
      const user = userEvent.setup();
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Dental")).toBeInTheDocument(),
      );

      await user.type(screen.getByRole("searchbox"), "zzznomatch");

      expect(screen.getByText(/no topics found/i)).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("opens confirm dialog when Delete is clicked", async () => {
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(
          2,
        ),
      );

      await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it("calls deleteTopic and removes row on confirm", async () => {
      vi.spyOn(topicService, "deleteTopic").mockResolvedValue({});
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
        expect(topicService.deleteTopic).toHaveBeenCalledWith("t1"),
      );
      expect(screen.queryByText("Dental")).toBeNull();
    });

    it("cancels delete dialog without calling deleteTopic", async () => {
      vi.spyOn(topicService, "deleteTopic").mockResolvedValue({});
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(
          2,
        ),
      );

      await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(topicService.deleteTopic).not.toHaveBeenCalled();
      expect(screen.getByText("Dental")).toBeInTheDocument();
    });

    it("calls updateTopic with is_active:false when Deactivate is clicked", async () => {
      vi.spyOn(topicService, "updateTopic").mockResolvedValue({
        data: { ...mockTopics[0], is_active: false },
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
        expect(topicService.updateTopic).toHaveBeenCalledWith("t1", {
          is_active: false,
        }),
      );
    });

    it("calls updateTopic with is_active:true when Activate is clicked", async () => {
      vi.spyOn(topicService, "updateTopic").mockResolvedValue({
        data: { ...mockTopics[1], is_active: true },
      });
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Activate" }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: "Activate" }));

      await waitFor(() =>
        expect(topicService.updateTopic).toHaveBeenCalledWith("t2", {
          is_active: true,
        }),
      );
    });

    it("shows error alert when delete fails", async () => {
      vi.spyOn(topicService, "deleteTopic").mockRejectedValue(
        new Error("fail"),
      );
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
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    });
  });
});
