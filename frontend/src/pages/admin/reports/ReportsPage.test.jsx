import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ReportsPage from "./ReportsPage";

vi.mock("../../../hooks/useAuth");
import { useAuth } from "../../../hooks/useAuth";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function setupMocks(isAdmin = false) {
  useAuth.mockReturnValue({
    user: {
      _id: "u1",
      email: "test@example.com",
      user_role: isAdmin ? "admin" : "editor",
    },
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>,
  );
}

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Layout", () => {
    it("renders the Reports heading", () => {
      setupMocks();
      renderPage();
      expect(
        screen.getByRole("heading", { name: /reports/i }),
      ).toBeInTheDocument();
    });

    it("renders report cards for non-admin users", () => {
      setupMocks(false);
      renderPage();
      expect(screen.getByText("Pathway Utilization")).toBeInTheDocument();
      expect(screen.getByText("Pathway Coverage")).toBeInTheDocument();
      expect(screen.getByText("Content Audit")).toBeInTheDocument();
      expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
    });

    it("renders audit log card for admin users", () => {
      setupMocks(true);
      renderPage();
      expect(screen.getByText("Audit Log")).toBeInTheDocument();
    });

    it("shows Run report links for visible reports (non-admin)", () => {
      setupMocks(false);
      renderPage();
      const runLinks = screen.getAllByText(/run report/i);
      expect(runLinks).toHaveLength(3);
    });

    it("shows 4 Run report links for admins", () => {
      setupMocks(true);
      renderPage();
      const runLinks = screen.getAllByText(/run report/i);
      expect(runLinks).toHaveLength(4);
    });
  });

  describe("Navigation", () => {
    it("navigates to utilization report on card click", async () => {
      setupMocks();
      renderPage();
      const user = userEvent.setup();
      await user.click(
        screen.getByRole("button", { name: /pathway utilization/i }),
      );
      expect(mockNavigate).toHaveBeenCalledWith("utilization");
    });

    it("navigates to coverage report on card click", async () => {
      setupMocks();
      renderPage();
      const user = userEvent.setup();
      await user.click(
        screen.getByRole("button", { name: /pathway coverage/i }),
      );
      expect(mockNavigate).toHaveBeenCalledWith("coverage");
    });

    it("navigates to content audit on card click", async () => {
      setupMocks();
      renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /content audit/i }));
      expect(mockNavigate).toHaveBeenCalledWith("content-audit");
    });

    it("navigates to audit log on card click (admin)", async () => {
      setupMocks(true);
      renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /audit log/i }));
      expect(mockNavigate).toHaveBeenCalledWith("audit-log");
    });

    it("navigates on Enter keydown", async () => {
      setupMocks();
      renderPage();
      const user = userEvent.setup();
      const card = screen.getByRole("button", { name: /pathway utilization/i });
      card.focus();
      await user.keyboard("{Enter}");
      expect(mockNavigate).toHaveBeenCalledWith("utilization");
    });
  });
});
