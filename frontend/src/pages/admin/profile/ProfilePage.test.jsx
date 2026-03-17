import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { toast } from "react-toastify";
import ProfilePage from "./ProfilePage";
import * as personService from "../../../services/personService";
import * as userService from "../../../services/userService";

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../hooks/useAuth");
import { useAuth } from "../../../hooks/useAuth";

const mockUser = {
  _id: "u1",
  email: "admin@example.com",
  user_role: "admin",
};

const mockPerson = {
  _id: "p1",
  user_id: { _id: "u1", email: "admin@example.com", user_role: "admin" },
  first_name: "Jane",
  middle_name: "A",
  last_name: "Doe",
  suffix: "MD",
};

function setupMocks(personResponse = mockPerson) {
  useAuth.mockReturnValue({ user: mockUser });
  vi.spyOn(personService, "getPersonProfile").mockResolvedValue({
    data: personResponse,
  });
  vi.spyOn(personService, "updatePersonProfile").mockResolvedValue({
    data: personResponse,
  });
  vi.spyOn(personService, "createPerson").mockResolvedValue({
    data: personResponse,
  });
  vi.spyOn(userService, "changePassword").mockResolvedValue({
    data: { message: "Password updated successfully" },
  });
}

function setup404() {
  useAuth.mockReturnValue({ user: mockUser });
  const err = { response: { status: 404 } };
  vi.spyOn(personService, "getPersonProfile").mockRejectedValue(err);
  vi.spyOn(personService, "updatePersonProfile").mockResolvedValue({
    data: mockPerson,
  });
  vi.spyOn(personService, "createPerson").mockResolvedValue({
    data: mockPerson,
  });
  vi.spyOn(userService, "changePassword").mockResolvedValue({
    data: { message: "Password updated successfully" },
  });
}

function renderPage() {
  return render(<ProfilePage />);
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Layout", () => {
    it("renders the My Profile heading", () => {
      setupMocks();
      renderPage();
      expect(
        screen.getByRole("heading", { name: /my profile/i }),
      ).toBeInTheDocument();
    });

    it("renders account section with email and role", () => {
      setupMocks();
      renderPage();
      expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("renders the personal information card", () => {
      setupMocks();
      renderPage();
      expect(screen.getByText(/personal information/i)).toBeInTheDocument();
    });

    it("renders the Save Profile button", async () => {
      setupMocks();
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /save profile/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Data loading", () => {
    it("pre-fills form fields from loaded person profile", async () => {
      setupMocks();
      renderPage();
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toHaveValue("Jane");
        expect(screen.getByLabelText(/middle name/i)).toHaveValue("A");
        expect(screen.getByLabelText(/last name/i)).toHaveValue("Doe");
        expect(screen.getByLabelText(/suffix/i)).toHaveValue("MD");
      });
    });

    it("shows an error alert when loading fails with non-404 error", async () => {
      useAuth.mockReturnValue({ user: mockUser });
      vi.spyOn(personService, "getPersonProfile").mockRejectedValue(
        new Error("Server error"),
      );
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
      });
    });

    it("shows empty form when profile not found (404)", async () => {
      setup404();
      renderPage();
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toHaveValue("");
        expect(screen.getByLabelText(/last name/i)).toHaveValue("");
      });
    });
  });

  describe("Saving (edit mode)", () => {
    it("calls updatePersonProfile on save when profile exists", async () => {
      setupMocks();
      renderPage();
      await waitFor(() =>
        expect(screen.getByLabelText(/first name/i)).toHaveValue("Jane"),
      );

      await userEvent.clear(screen.getByLabelText(/first name/i));
      await userEvent.type(screen.getByLabelText(/first name/i), "Janet");
      await userEvent.click(
        screen.getByRole("button", { name: /save profile/i }),
      );

      await waitFor(() => {
        expect(personService.updatePersonProfile).toHaveBeenCalledWith(
          expect.objectContaining({ first_name: "Janet" }),
        );
      });
    });

    it("shows success toast after saving", async () => {
      setupMocks();
      renderPage();
      await waitFor(() =>
        expect(screen.getByLabelText(/first name/i)).toHaveValue("Jane"),
      );

      await userEvent.click(
        screen.getByRole("button", { name: /save profile/i }),
      );

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Profile saved.");
      });
    });

    it("shows error toast when save fails", async () => {
      setupMocks();
      vi.spyOn(personService, "updatePersonProfile").mockRejectedValue(
        new Error("fail"),
      );
      renderPage();
      await waitFor(() =>
        expect(screen.getByLabelText(/first name/i)).toHaveValue("Jane"),
      );

      await userEvent.click(
        screen.getByRole("button", { name: /save profile/i }),
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to save profile.");
      });
    });
  });

  describe("Create mode (no existing profile)", () => {
    it("calls createPerson when saving for the first time", async () => {
      setup404();
      renderPage();
      await waitFor(() =>
        expect(screen.getByLabelText(/first name/i)).toHaveValue(""),
      );

      await userEvent.type(screen.getByLabelText(/first name/i), "John");
      await userEvent.type(screen.getByLabelText(/last name/i), "Smith");
      await userEvent.click(
        screen.getByRole("button", { name: /save profile/i }),
      );

      await waitFor(() => {
        expect(personService.createPerson).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: "u1",
            first_name: "John",
            last_name: "Smith",
          }),
        );
        expect(toast.success).toHaveBeenCalledWith("Profile saved.");
      });
    });
  });

  describe("Change Password", () => {
    const VALID_NEW_PW = "NewSecure@456!";

    it("renders the Change Password card", () => {
      setupMocks();
      renderPage();
      expect(
        screen.getByRole("button", { name: /change password/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/confirm new password/i),
      ).toBeInTheDocument();
    });

    it("calls changePassword and shows success toast on valid submit", async () => {
      setupMocks();
      renderPage();

      await userEvent.type(
        screen.getByLabelText(/current password/i),
        "OldPass123!",
      );
      await userEvent.type(
        screen.getByLabelText(/^new password/i),
        VALID_NEW_PW,
      );
      await userEvent.type(
        screen.getByLabelText(/confirm new password/i),
        VALID_NEW_PW,
      );
      await userEvent.click(
        screen.getByRole("button", { name: /change password/i }),
      );

      await waitFor(() => {
        expect(userService.changePassword).toHaveBeenCalledWith({
          current_password: "OldPass123!",
          new_password: VALID_NEW_PW,
        });
        expect(toast.success).toHaveBeenCalledWith(
          "Password changed successfully.",
        );
      });
    });

    it("clears fields after successful change", async () => {
      setupMocks();
      renderPage();

      await userEvent.type(
        screen.getByLabelText(/current password/i),
        "OldPass123!",
      );
      await userEvent.type(
        screen.getByLabelText(/^new password/i),
        VALID_NEW_PW,
      );
      await userEvent.type(
        screen.getByLabelText(/confirm new password/i),
        VALID_NEW_PW,
      );
      await userEvent.click(
        screen.getByRole("button", { name: /change password/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/current password/i)).toHaveValue("");
        expect(screen.getByLabelText(/^new password/i)).toHaveValue("");
        expect(screen.getByLabelText(/confirm new password/i)).toHaveValue("");
      });
    });

    it("shows inline error when passwords do not match", async () => {
      setupMocks();
      renderPage();

      await userEvent.type(
        screen.getByLabelText(/current password/i),
        "OldPass123!",
      );
      await userEvent.type(
        screen.getByLabelText(/^new password/i),
        VALID_NEW_PW,
      );
      await userEvent.type(
        screen.getByLabelText(/confirm new password/i),
        "DifferentPass1!",
      );
      await userEvent.click(
        screen.getByRole("button", { name: /change password/i }),
      );

      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      expect(userService.changePassword).not.toHaveBeenCalled();
    });

    it("shows API error message when backend rejects the request", async () => {
      setupMocks();
      vi.spyOn(userService, "changePassword").mockRejectedValue({
        response: { data: { message: "Current password is incorrect" } },
      });
      renderPage();

      await userEvent.type(
        screen.getByLabelText(/current password/i),
        "WrongPass1!",
      );
      await userEvent.type(
        screen.getByLabelText(/^new password/i),
        VALID_NEW_PW,
      );
      await userEvent.type(
        screen.getByLabelText(/confirm new password/i),
        VALID_NEW_PW,
      );
      await userEvent.click(
        screen.getByRole("button", { name: /change password/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/current password is incorrect/i),
        ).toBeInTheDocument();
      });
    });
  });
});
