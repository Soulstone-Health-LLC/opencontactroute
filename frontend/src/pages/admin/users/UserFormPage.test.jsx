import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import UserFormPage from "./UserFormPage";
import * as userService from "../../../services/userService";
import * as personService from "../../../services/personService";

const mockUser = {
  _id: "u1",
  email: "alice@example.com",
  user_role: "user",
  is_active: true,
};

const mockPerson = {
  _id: "p1",
  user_id: "u1",
  first_name: "Alice",
  middle_name: "",
  last_name: "Smith",
  suffix: "",
};

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={["/admin/users/new"]}>
      <Routes>
        <Route path="/admin/users/new" element={<UserFormPage />} />
        <Route path="/admin/users" element={<div>Users List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={["/admin/users/u1/edit"]}>
      <Routes>
        <Route path="/admin/users/:id/edit" element={<UserFormPage />} />
        <Route path="/admin/users" element={<div>Users List</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("UserFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create mode", () => {
    it("renders the New User heading", () => {
      renderCreate();
      expect(
        screen.getByRole("heading", { name: /new user/i }),
      ).toBeInTheDocument();
    });

    it("renders email, password, role, and person fields", () => {
      renderCreate();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    });

    it("renders Create User submit button", () => {
      renderCreate();
      expect(
        screen.getByRole("button", { name: /create user/i }),
      ).toBeInTheDocument();
    });

    it("shows validation error when email is empty on submit", async () => {
      const user = userEvent.setup();
      renderCreate();

      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    it("shows validation error when password is empty on submit", async () => {
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/email/i), "alice@example.com");
      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    it("calls createUser then createPerson on successful submit", async () => {
      vi.spyOn(userService, "createUser").mockResolvedValue({
        data: { _id: "u1" },
      });
      vi.spyOn(personService, "createPerson").mockResolvedValue({ data: {} });
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/email/i), "alice@example.com");
      await user.type(screen.getByLabelText(/password/i), "secret123");
      await user.type(screen.getByLabelText(/first name/i), "Alice");
      await user.type(screen.getByLabelText(/last name/i), "Smith");
      await user.click(screen.getByRole("button", { name: /create user/i }));

      await waitFor(() =>
        expect(userService.createUser).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "alice@example.com",
            password: "secret123",
          }),
        ),
      );
      expect(personService.createPerson).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "u1", first_name: "Alice" }),
      );
    });

    it("navigates to users list on successful create", async () => {
      vi.spyOn(userService, "createUser").mockResolvedValue({
        data: { _id: "u1" },
      });
      vi.spyOn(personService, "createPerson").mockResolvedValue({ data: {} });
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/email/i), "alice@example.com");
      await user.type(screen.getByLabelText(/password/i), "secret123");
      await user.click(screen.getByRole("button", { name: /create user/i }));

      await waitFor(() =>
        expect(screen.getByText("Users List")).toBeInTheDocument(),
      );
    });

    it("shows API error on failed create", async () => {
      vi.spyOn(userService, "createUser").mockRejectedValue({
        response: { data: { message: "User already exists" } },
      });
      const user = userEvent.setup();
      renderCreate();

      await user.type(screen.getByLabelText(/email/i), "alice@example.com");
      await user.type(screen.getByLabelText(/password/i), "secret123");
      await user.click(screen.getByRole("button", { name: /create user/i }));

      await waitFor(() =>
        expect(screen.getByText(/user already exists/i)).toBeInTheDocument(),
      );
    });
  });

  describe("Edit mode", () => {
    beforeEach(() => {
      vi.spyOn(userService, "getUser").mockResolvedValue({ data: mockUser });
      vi.spyOn(personService, "getPersonByUser").mockResolvedValue({
        data: mockPerson,
      });
    });

    it("renders the Edit User heading", async () => {
      renderEdit();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /edit user/i }),
        ).toBeInTheDocument(),
      );
    });

    it("does not render account password field in edit mode", async () => {
      renderEdit();
      await waitFor(() =>
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument(),
      );
      // The account creation password input (id="password") should not be present in edit mode
      expect(screen.queryByLabelText("Password")).toBeNull();
    });

    it("pre-fills email and role from loaded user", async () => {
      renderEdit();
      await waitFor(() =>
        expect(screen.getByLabelText(/email/i)).toHaveValue(
          "alice@example.com",
        ),
      );
      expect(screen.getByLabelText(/role/i)).toHaveValue("user");
    });

    it("pre-fills person fields from loaded person", async () => {
      renderEdit();
      await waitFor(() =>
        expect(screen.getByLabelText(/first name/i)).toHaveValue("Alice"),
      );
      expect(screen.getByLabelText(/last name/i)).toHaveValue("Smith");
    });

    it("renders Save User submit button", async () => {
      renderEdit();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /save user/i }),
        ).toBeInTheDocument(),
      );
    });

    it("calls updateUser and updatePerson on save", async () => {
      vi.spyOn(userService, "updateUser").mockResolvedValue({ data: mockUser });
      vi.spyOn(personService, "updatePerson").mockResolvedValue({ data: {} });
      const user = userEvent.setup();
      renderEdit();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /save user/i }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /save user/i }));

      await waitFor(() =>
        expect(userService.updateUser).toHaveBeenCalledWith(
          "u1",
          expect.objectContaining({ email: "alice@example.com" }),
        ),
      );
      expect(personService.updatePerson).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ first_name: "Alice" }),
      );
    });

    it("navigates to users list on successful save", async () => {
      vi.spyOn(userService, "updateUser").mockResolvedValue({ data: mockUser });
      vi.spyOn(personService, "updatePerson").mockResolvedValue({ data: {} });
      const user = userEvent.setup();
      renderEdit();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /save user/i }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /save user/i }));

      await waitFor(() =>
        expect(screen.getByText("Users List")).toBeInTheDocument(),
      );
    });

    it("calls createPerson when no existing person record", async () => {
      vi.spyOn(personService, "getPersonByUser").mockRejectedValue({
        response: { status: 404 },
      });
      vi.spyOn(userService, "updateUser").mockResolvedValue({ data: mockUser });
      vi.spyOn(personService, "createPerson").mockResolvedValue({ data: {} });
      const user = userEvent.setup();
      renderEdit();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /save user/i }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /save user/i }));

      await waitFor(() =>
        expect(personService.createPerson).toHaveBeenCalledWith(
          expect.objectContaining({ user_id: "u1" }),
        ),
      );
    });

    it("shows API error on failed save", async () => {
      vi.spyOn(userService, "updateUser").mockRejectedValue({
        response: { data: { message: "Update failed" } },
      });
      const user = userEvent.setup();
      renderEdit();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /save user/i }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: /save user/i }));

      await waitFor(() =>
        expect(screen.getByText(/update failed/i)).toBeInTheDocument(),
      );
    });

    it("shows load error when getUser fails", async () => {
      vi.spyOn(userService, "getUser").mockRejectedValue(new Error("fail"));
      renderEdit();
      await waitFor(() =>
        expect(screen.getByRole("alert")).toBeInTheDocument(),
      );
    });
  });

  describe("Change Password card (edit mode)", () => {
    beforeEach(() => {
      vi.spyOn(userService, "getUser").mockResolvedValue({ data: mockUser });
      vi.spyOn(personService, "getPersonByUser").mockResolvedValue({
        data: mockPerson,
      });
    });

    it("renders Change Password card in edit mode", async () => {
      renderEdit();
      await waitFor(() =>
        expect(screen.getByText(/change password/i)).toBeInTheDocument(),
      );
    });

    it("does not render Change Password card in create mode", () => {
      renderCreate();
      expect(screen.queryByText(/change password/i)).toBeNull();
    });

    it("renders new password and confirm fields", async () => {
      renderEdit();
      await waitFor(() =>
        expect(screen.getByLabelText("New Password")).toBeInTheDocument(),
      );
      expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
    });

    it("shows mismatch error when passwords do not match", async () => {
      const user = userEvent.setup();
      renderEdit();
      await waitFor(() =>
        expect(screen.getByLabelText("New Password")).toBeInTheDocument(),
      );

      await user.type(screen.getByLabelText("New Password"), "abc123");
      await user.type(screen.getByLabelText("Confirm New Password"), "xyz999");
      await user.click(screen.getByRole("button", { name: /set password/i }));

      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it("calls adminChangePassword and clears fields on success", async () => {
      vi.spyOn(userService, "adminChangePassword").mockResolvedValue({});
      const user = userEvent.setup();
      renderEdit();
      await waitFor(() =>
        expect(screen.getByLabelText("New Password")).toBeInTheDocument(),
      );

      await user.type(screen.getByLabelText("New Password"), "NewPass1!");
      await user.type(
        screen.getByLabelText("Confirm New Password"),
        "NewPass1!",
      );
      await user.click(screen.getByRole("button", { name: /set password/i }));

      await waitFor(() =>
        expect(userService.adminChangePassword).toHaveBeenCalledWith("u1", {
          new_password: "NewPass1!",
        }),
      );
      expect(screen.getByLabelText("New Password")).toHaveValue("");
    });

    it("shows API error when adminChangePassword rejects", async () => {
      vi.spyOn(userService, "adminChangePassword").mockRejectedValue({
        response: { data: { message: "User not found" } },
      });
      const user = userEvent.setup();
      renderEdit();
      await waitFor(() =>
        expect(screen.getByLabelText("New Password")).toBeInTheDocument(),
      );

      await user.type(screen.getByLabelText("New Password"), "NewPass1!");
      await user.type(
        screen.getByLabelText("Confirm New Password"),
        "NewPass1!",
      );
      await user.click(screen.getByRole("button", { name: /set password/i }));

      await waitFor(() =>
        expect(screen.getByText(/user not found/i)).toBeInTheDocument(),
      );
    });
  });
});
