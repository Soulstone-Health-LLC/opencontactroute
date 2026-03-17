import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import LoginPage from "./LoginPage";
import * as authService from "../../services/authService";
import { AuthContext } from "../../context/AuthContext";

// Helper: render LoginPage with the required context and router
function renderLoginPage(setUser = vi.fn()) {
  return render(
    <AuthContext.Provider value={{ user: null, setUser, loading: false }}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("LoginPage", () => {
  describe("Layout and accessibility", () => {
    it("renders a log in heading", () => {
      renderLoginPage();
      expect(
        screen.getByRole("heading", { name: /log in/i }),
      ).toBeInTheDocument();
    });

    it("renders email and password fields with visible labels", () => {
      renderLoginPage();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it("associates labels with inputs via htmlFor / id", () => {
      renderLoginPage();
      const email = screen.getByLabelText(/email address/i);
      const password = screen.getByLabelText(/password/i);
      expect(email).toHaveAttribute("id", "email");
      expect(password).toHaveAttribute("id", "password");
    });

    it("marks email and password as required", () => {
      renderLoginPage();
      expect(screen.getByLabelText(/email address/i)).toBeRequired();
      expect(screen.getByLabelText(/password/i)).toBeRequired();
    });

    it("renders the submit button", () => {
      renderLoginPage();
      expect(
        screen.getByRole("button", { name: /log in/i }),
      ).toBeInTheDocument();
    });

    it("renders the branding column with the app name", () => {
      renderLoginPage();
      expect(screen.getByText(/opencontactroute/i)).toBeInTheDocument();
    });
  });

  describe("Form behaviour", () => {
    it("disables the button and shows loading text while submitting", async () => {
      vi.spyOn(authService, "login").mockReturnValue(new Promise(() => {})); // never resolves
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(
        screen.getByLabelText(/email address/i),
        "admin@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "password");
      await user.click(screen.getByRole("button", { name: /log in/i }));

      expect(
        screen.getByRole("button", { name: /logging in/i }),
      ).toBeDisabled();
    });

    it("calls login service with email and password on submit", async () => {
      const mockLogin = vi
        .spyOn(authService, "login")
        .mockResolvedValue({ data: { email: "admin@example.com" } });
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(
        screen.getByLabelText(/email address/i),
        "admin@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "secret");
      await user.click(screen.getByRole("button", { name: /log in/i }));

      expect(mockLogin).toHaveBeenCalledWith({
        email: "admin@example.com",
        password: "secret",
      });
    });

    it("calls setUser with the response data on success", async () => {
      const userData = { email: "admin@example.com", user_role: "admin" };
      vi.spyOn(authService, "login").mockResolvedValue({ data: userData });
      const setUser = vi.fn();
      const user = userEvent.setup();
      renderLoginPage(setUser);

      await user.type(
        screen.getByLabelText(/email address/i),
        "admin@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "secret");
      await user.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() => expect(setUser).toHaveBeenCalledWith(userData));
    });

    it("displays an error alert when login fails", async () => {
      vi.spyOn(authService, "login").mockRejectedValue({
        response: { data: { message: "Invalid credentials" } },
      });
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(
        screen.getByLabelText(/email address/i),
        "bad@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "wrong");
      await user.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Invalid credentials",
        ),
      );
    });

    it("displays a fallback error message when the server returns no message", async () => {
      vi.spyOn(authService, "login").mockRejectedValue({});
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(
        screen.getByLabelText(/email address/i),
        "bad@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "wrong");
      await user.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/login failed/i),
      );
    });

    it("re-enables the submit button after a failed login", async () => {
      vi.spyOn(authService, "login").mockRejectedValue({});
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(
        screen.getByLabelText(/email address/i),
        "bad@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "wrong");
      await user.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /log in/i }),
        ).not.toBeDisabled(),
      );
    });
  });
});
