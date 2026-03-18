import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import AudiencesListPage from "./AudiencesListPage";
import * as audienceService from "../../../services/audienceService";
import { AuthContext } from "../../../context/AuthContext";

const mockAudiences = [
  {
    _id: "a1",
    name: "Members",
    slug: "members",
    sort_order: 0,
    is_active: true,
    updatedAt: "2026-03-10T12:00:00.000Z",
  },
  {
    _id: "a2",
    name: "Providers",
    slug: "providers",
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
        <AudiencesListPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("AudiencesListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(audienceService, "getAudiences").mockResolvedValue({
      data: mockAudiences,
    });
  });

  describe("Layout", () => {
    it("renders the Audiences heading", async () => {
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /audiences/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders the New Audience button for admin", async () => {
      renderList("admin");
      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /new audience/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders the New Audience button for super user", async () => {
      renderList("super user");
      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /new audience/i }),
        ).toBeInTheDocument(),
      );
    });

    it("hides the New Audience button for user role", async () => {
      renderList("user");
      await waitFor(() =>
        expect(
          screen.queryByRole("link", { name: /new audience/i }),
        ).toBeNull(),
      );
    });

    it("renders a search input", async () => {
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("searchbox", { name: /search audiences/i }),
        ).toBeInTheDocument(),
      );
    });
  });

  describe("Data loading", () => {
    it("renders audience names in the table", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Members")).toBeInTheDocument(),
      );
      // Providers is inactive and hidden by default
      expect(screen.queryByText("Providers")).toBeNull();
    });

    it("shows Active badge for active audiences", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Active")).toBeInTheDocument(),
      );
    });

    it("shows Inactive badge for inactive audiences", async () => {
      const user = userEvent.setup();
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Members")).toBeInTheDocument(),
      );
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

    it("shows Deactivate button for active audience (admin)", async () => {
      renderList("admin");
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /deactivate/i }),
        ).toBeInTheDocument(),
      );
    });

    it("shows Activate button for inactive audience (admin)", async () => {
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() =>
        expect(screen.getByText("Members")).toBeInTheDocument(),
      );
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
      await waitFor(() =>
        expect(screen.getByText("Members")).toBeInTheDocument(),
      );
      expect(screen.queryByRole("button", { name: /deactivate/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    });

    it("shows error alert when load fails", async () => {
      vi.spyOn(audienceService, "getAudiences").mockRejectedValue(
        new Error("fail"),
      );
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
        expect(screen.getByText("Members")).toBeInTheDocument(),
      );

      await user.click(
        screen.getByRole("checkbox", { name: /show inactive/i }),
      );
      await user.type(screen.getByRole("searchbox"), "prov");

      expect(screen.queryByText("Members")).toBeNull();
      expect(screen.getByText("Providers")).toBeInTheDocument();
    });

    it("shows no-results message when search matches nothing", async () => {
      const user = userEvent.setup();
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Members")).toBeInTheDocument(),
      );

      await user.type(screen.getByRole("searchbox"), "zzznomatch");

      expect(screen.getByText(/no audiences found/i)).toBeInTheDocument();
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

    it("calls deleteAudience and removes row on confirm", async () => {
      vi.spyOn(audienceService, "deleteAudience").mockResolvedValue({});
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
        expect(audienceService.deleteAudience).toHaveBeenCalledWith("a1"),
      );
      expect(screen.queryByText("Members")).toBeNull();
    });

    it("cancels delete dialog without calling deleteAudience", async () => {
      vi.spyOn(audienceService, "deleteAudience").mockResolvedValue({});
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(
          1,
        ),
      );

      await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(audienceService.deleteAudience).not.toHaveBeenCalled();
      expect(screen.getByText("Members")).toBeInTheDocument();
    });

    it("calls updateAudience with is_active:false when Deactivate is clicked", async () => {
      vi.spyOn(audienceService, "updateAudience").mockResolvedValue({
        data: { ...mockAudiences[0], is_active: false },
      });
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /deactivate/i }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /deactivate/i }));

      expect(audienceService.updateAudience).toHaveBeenCalledWith("a1", {
        is_active: false,
      });
    });

    it("calls updateAudience with is_active:true when Activate is clicked", async () => {
      vi.spyOn(audienceService, "updateAudience").mockResolvedValue({
        data: { ...mockAudiences[1], is_active: true },
      });
      const user = userEvent.setup();
      renderList("admin");
      await waitFor(() =>
        expect(screen.getByText("Members")).toBeInTheDocument(),
      );
      await user.click(
        screen.getByRole("checkbox", { name: /show inactive/i }),
      );

      await user.click(screen.getByRole("button", { name: "Activate" }));

      await waitFor(() =>
        expect(audienceService.updateAudience).toHaveBeenCalledWith("a2", {
          is_active: true,
        }),
      );
    });

    it("shows error alert when delete fails", async () => {
      vi.spyOn(audienceService, "deleteAudience").mockRejectedValue(
        new Error("fail"),
      );
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
