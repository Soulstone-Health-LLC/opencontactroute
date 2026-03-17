import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import UsersListPage from "./UsersListPage";
import * as userService from "../../../services/userService";
import * as personService from "../../../services/personService";

const mockUsers = [
  {
    _id: "u1",
    email: "alice@example.com",
    user_role: "admin",
    is_active: true,
    updatedAt: "2026-03-10T12:00:00.000Z",
  },
  {
    _id: "u2",
    email: "bob@example.com",
    user_role: "user",
    is_active: false,
    updatedAt: "2026-03-09T08:00:00.000Z",
  },
];

const mockPersons = [
  {
    _id: "p1",
    user_id: { _id: "u1", email: "alice@example.com" },
    first_name: "Alice",
    last_name: "Smith",
  },
  {
    _id: "p2",
    user_id: { _id: "u2", email: "bob@example.com" },
    first_name: "Bob",
    last_name: "Jones",
  },
];

function renderList() {
  return render(
    <MemoryRouter>
      <UsersListPage />
    </MemoryRouter>,
  );
}

describe("UsersListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(userService, "getUsers").mockResolvedValue({ data: mockUsers });
    vi.spyOn(personService, "getPersons").mockResolvedValue({
      data: mockPersons,
    });
  });

  describe("Layout", () => {
    it("renders the Users heading", async () => {
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /users/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders the New User button", async () => {
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: /new user/i }),
        ).toBeInTheDocument(),
      );
    });

    it("renders table column headers", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Email")).toBeInTheDocument(),
      );
      expect(screen.getByText("Role")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });
  });

  describe("Data loading", () => {
    it("renders display names from persons", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Alice Smith")).toBeInTheDocument(),
      );
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });

    it("renders email addresses", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("alice@example.com")).toBeInTheDocument(),
      );
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    });

    it("renders role badges", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Admin")).toBeInTheDocument(),
      );
      expect(screen.getByText("User")).toBeInTheDocument();
    });

    it("shows Active badge for active users", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Active")).toBeInTheDocument(),
      );
    });

    it("shows Inactive badge for inactive users", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText("Inactive")).toBeInTheDocument(),
      );
    });

    it("shows dash for name when no person record exists", async () => {
      vi.spyOn(personService, "getPersons").mockResolvedValue({ data: [] });
      renderList();
      await waitFor(() =>
        expect(screen.getByText("alice@example.com")).toBeInTheDocument(),
      );
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    });

    it("renders Edit links for each row", async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getAllByRole("link", { name: /edit/i })).toHaveLength(2),
      );
    });

    it("shows Deactivate button for active user", async () => {
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /deactivate/i }),
        ).toBeInTheDocument(),
      );
    });

    it("shows Activate button for inactive user", async () => {
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Activate" }),
        ).toBeInTheDocument(),
      );
    });

    it("shows error alert when load fails", async () => {
      vi.spyOn(userService, "getUsers").mockRejectedValue(new Error("fail"));
      renderList();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    });

    it("shows no users message when list is empty", async () => {
      vi.spyOn(userService, "getUsers").mockResolvedValue({ data: [] });
      renderList();
      await waitFor(() =>
        expect(screen.getByText(/no users found/i)).toBeInTheDocument(),
      );
    });
  });

  describe("Actions", () => {
    it("opens confirm dialog when Deactivate is clicked", async () => {
      const user = userEvent.setup();
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /deactivate/i }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /deactivate/i }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/deactivate user/i)).toBeInTheDocument();
    });

    it("opens confirm dialog when Activate is clicked", async () => {
      const user = userEvent.setup();
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Activate" }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: "Activate" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/activate user/i)).toBeInTheDocument();
    });

    it("calls deactivateUser and updates badge on confirm", async () => {
      vi.spyOn(userService, "deactivateUser").mockResolvedValue({
        data: { _id: "u1", is_active: false },
      });
      const user = userEvent.setup();
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /deactivate/i }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /deactivate/i }));
      await user.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() =>
        expect(userService.deactivateUser).toHaveBeenCalledWith("u1"),
      );
    });

    it("calls activateUser on confirm", async () => {
      vi.spyOn(userService, "activateUser").mockResolvedValue({
        data: { _id: "u2", is_active: true },
      });
      const user = userEvent.setup();
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Activate" }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: "Activate" }));
      await user.click(screen.getByRole("button", { name: /confirm/i }));

      await waitFor(() =>
        expect(userService.activateUser).toHaveBeenCalledWith("u2"),
      );
    });

    it("cancels dialog without calling deactivateUser", async () => {
      vi.spyOn(userService, "deactivateUser").mockResolvedValue({});
      const user = userEvent.setup();
      renderList();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /deactivate/i }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /deactivate/i }));
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(userService.deactivateUser).not.toHaveBeenCalled();
    });
  });
});
