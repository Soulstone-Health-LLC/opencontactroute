import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AuditLogReportPage from "./AuditLogReportPage";
import * as reportService from "../../../services/reportService";
import * as userService from "../../../services/userService";
import * as exportCsvModule from "../../../utils/exportCsv";

vi.mock("../../../utils/exportCsv", () => ({
  exportToCsv: vi.fn(),
}));

vi.mock("bootstrap", () => ({
  Tooltip: class {
    constructor() {}
    dispose() {}
  },
}));
// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockLogData = {
  total: 2,
  page: 1,
  limit: 25,
  pages: 1,
  data: [
    {
      _id: "log1",
      resource: "ContactPathway",
      resource_id: "507f1f77bcf86cd799439011",
      action: "update",
      changed_by: { email: "admin@example.com" },
      changed_at: "2024-02-10T14:30:00.000Z",
      changes: [
        { field: "status", old_value: "draft", new_value: "published" },
        { field: "department", old_value: "Claims", new_value: "Billing" },
      ],
    },
    {
      _id: "log2",
      resource: "Person",
      resource_id: "507f1f77bcf86cd799439012",
      action: "create",
      changed_by: { email: "editor@example.com" },
      changed_at: "2024-03-01T09:00:00.000Z",
      changes: [],
    },
  ],
};

const mockUsers = [
  { _id: "u1", email: "admin@example.com" },
  { _id: "u2", email: "editor@example.com" },
];

const mockEmpty = { total: 0, page: 1, limit: 25, pages: 1, data: [] };

function setupMock(data = mockLogData) {
  vi.spyOn(reportService, "getAuditLog").mockResolvedValue({ data });
  vi.spyOn(userService, "getUsers").mockResolvedValue({ data: mockUsers });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AuditLogReportPage />
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AuditLogReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Layout ──────────────────────────────────────────────────────────────────

  describe("Layout", () => {
    it("renders the page heading", () => {
      setupMock();
      renderPage();
      expect(
        screen.getByRole("heading", { name: /audit log/i }),
      ).toBeInTheDocument();
    });

    it("renders a back link to /admin/reports", () => {
      setupMock();
      renderPage();
      const link = screen.getByRole("link", { name: /reports/i });
      expect(link).toHaveAttribute("href", "/admin/reports");
    });

    it("renders the Resource filter select", () => {
      setupMock();
      renderPage();
      expect(screen.getByLabelText(/resource/i)).toBeInTheDocument();
    });

    it("renders the Action filter select", () => {
      setupMock();
      renderPage();
      expect(screen.getByLabelText(/action/i)).toBeInTheDocument();
    });

    it("renders From and To date inputs", () => {
      setupMock();
      renderPage();
      expect(screen.getByLabelText(/from/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/to/i)).toBeInTheDocument();
    });

    it("renders the User filter select", () => {
      setupMock();
      renderPage();
      expect(screen.getByLabelText(/^user$/i)).toBeInTheDocument();
    });

    it("populates User dropdown with fetched user emails", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(
          screen.getByRole("option", { name: "admin@example.com" }),
        ).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("option", { name: "editor@example.com" }),
      ).toBeInTheDocument();
    });

    it("renders Apply and Reset buttons", () => {
      setupMock();
      renderPage();
      expect(
        screen.getByRole("button", { name: /apply/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reset/i }),
      ).toBeInTheDocument();
    });

    it("renders table column headers", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("update")).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("columnheader", { name: /date\/time/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /^user$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /^action$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /^resource$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /resource id/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /^field$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /^before$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /^after$/i }),
      ).toBeInTheDocument();
    });

    it("renders an InfoTooltip on the Resource ID column header", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("update")).toBeInTheDocument(),
      );
      // The ℹ glyph is rendered by InfoTooltip inside the th
      const th = screen.getByRole("columnheader", { name: /resource id/i });
      expect(
        th.querySelector("[data-bs-toggle='tooltip']"),
      ).toBeInTheDocument();
    });
  });

  // ── Data display ────────────────────────────────────────────────────────────

  describe("Data display", () => {
    it("renders row data after loading", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("update")).toBeInTheDocument(),
      );
      expect(
        screen.getAllByText("admin@example.com").length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText("ContactPathway").length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText("editor@example.com").length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Person").length).toBeGreaterThanOrEqual(1);
    });

    it("renders an update badge with bg-primary class", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("update")).toBeInTheDocument(),
      );
      expect(screen.getByText("update").className).toMatch(/bg-primary/);
    });

    it("renders a create badge with bg-success class", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("create")).toBeInTheDocument(),
      );
      expect(screen.getByText("create").className).toMatch(/bg-success/);
    });

    it("shows field names in the Field column", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("update")).toBeInTheDocument(),
      );
      expect(screen.getByText("status")).toBeInTheDocument();
      expect(screen.getByText("department")).toBeInTheDocument();
    });

    it("shows '—' in Field column for create entry with no changes", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("create")).toBeInTheDocument(),
      );
      // There should be at least one "—" cell for the no-changes row
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    });

    it("shows total count in card header after load", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText(/2 total/i)).toBeInTheDocument(),
      );
    });
  });

  // ── Flat column data ─────────────────────────────────────────────────────────

  describe("Flat column data", () => {
    it("shows before/after values in dedicated table cells", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("update")).toBeInTheDocument(),
      );
      expect(screen.getByText("draft")).toBeInTheDocument();
      expect(screen.getByText("published")).toBeInTheDocument();
      expect(screen.getByText("Claims")).toBeInTheDocument();
      expect(screen.getByText("Billing")).toBeInTheDocument();
    });

    it("produces one table row per change for a multi-change entry", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("status")).toBeInTheDocument(),
      );
      // thead row + 2 rows for update entry (2 changes) + 1 row for create entry (no changes)
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBe(4);
    });
  });

  // ── Empty state ─────────────────────────────────────────────────────────────

  describe("Empty state", () => {
    it("shows empty message when no data", async () => {
      setupMock(mockEmpty);
      renderPage();
      await waitFor(() =>
        expect(screen.getByText(/no log entries found/i)).toBeInTheDocument(),
      );
    });
  });

  // ── Error state ─────────────────────────────────────────────────────────────

  describe("Error state", () => {
    it("shows error alert on fetch failure", async () => {
      vi.spyOn(reportService, "getAuditLog").mockRejectedValue(
        new Error("Network error"),
      );
      vi.spyOn(userService, "getUsers").mockResolvedValue({ data: [] });
      renderPage();
      await waitFor(() =>
        expect(
          screen.getByText(/failed to load audit log/i),
        ).toBeInTheDocument(),
      );
    });
  });

  // ── Filtering ────────────────────────────────────────────────────────────────

  describe("Filtering", () => {
    it("calls getAuditLog with resource when applied", async () => {
      const spy = vi
        .spyOn(reportService, "getAuditLog")
        .mockResolvedValue({ data: mockLogData });
      renderPage();
      const user = userEvent.setup();
      await user.selectOptions(
        screen.getByLabelText(/resource/i),
        "ContactPathway",
      );
      await user.click(screen.getByRole("button", { name: /apply/i }));
      await waitFor(() => {
        const calls = spy.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.resource).toBe("ContactPathway");
      });
    });

    it("calls getAuditLog with action when applied", async () => {
      const spy = vi
        .spyOn(reportService, "getAuditLog")
        .mockResolvedValue({ data: mockLogData });
      renderPage();
      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText(/action/i), "update");
      await user.click(screen.getByRole("button", { name: /apply/i }));
      await waitFor(() => {
        const calls = spy.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.action).toBe("update");
      });
    });

    it("resets to page 1 when filter is applied", async () => {
      const spy = vi
        .spyOn(reportService, "getAuditLog")
        .mockResolvedValue({ data: mockLogData });
      renderPage();
      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText(/action/i), "create");
      await user.click(screen.getByRole("button", { name: /apply/i }));
      await waitFor(() => {
        const calls = spy.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.page).toBe(1);
      });
    });

    it("clears resource and action filters on Reset", async () => {
      const spy = vi
        .spyOn(reportService, "getAuditLog")
        .mockResolvedValue({ data: mockLogData });
      renderPage();
      const user = userEvent.setup();

      await user.selectOptions(
        screen.getByLabelText(/resource/i),
        "ContactPathway",
      );
      await user.selectOptions(screen.getByLabelText(/action/i), "update");
      await user.click(screen.getByRole("button", { name: /reset/i }));

      await waitFor(() => {
        const calls = spy.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.resource).toBeUndefined();
        expect(lastCall.action).toBeUndefined();
      });
    });
  });

  // ── User filter ──────────────────────────────────────────────────────────────

  describe("User filter", () => {
    it("calls getAuditLog with changed_by when user is selected and applied", async () => {
      const spy = vi
        .spyOn(reportService, "getAuditLog")
        .mockResolvedValue({ data: mockLogData });
      vi.spyOn(userService, "getUsers").mockResolvedValue({ data: mockUsers });
      renderPage();
      const user = userEvent.setup();
      await waitFor(() =>
        expect(
          screen.getByRole("option", { name: "admin@example.com" }),
        ).toBeInTheDocument(),
      );
      await user.selectOptions(
        screen.getByLabelText(/^user$/i),
        "admin@example.com",
      );
      await user.click(screen.getByRole("button", { name: /apply/i }));
      await waitFor(() => {
        const calls = spy.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.changed_by).toBe("u1");
      });
    });

    it("clears changed_by on Reset", async () => {
      const spy = vi
        .spyOn(reportService, "getAuditLog")
        .mockResolvedValue({ data: mockLogData });
      vi.spyOn(userService, "getUsers").mockResolvedValue({ data: mockUsers });
      renderPage();
      const user = userEvent.setup();
      await waitFor(() =>
        expect(
          screen.getByRole("option", { name: "admin@example.com" }),
        ).toBeInTheDocument(),
      );
      await user.selectOptions(
        screen.getByLabelText(/^user$/i),
        "admin@example.com",
      );
      await user.click(screen.getByRole("button", { name: /apply/i }));
      await user.click(screen.getByRole("button", { name: /reset/i }));
      await waitFor(() => {
        const calls = spy.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.changed_by).toBeUndefined();
      });
    });
  });

  // ── Pagination ───────────────────────────────────────────────────────────────

  describe("Pagination", () => {
    it("shows pagination when multiple pages", async () => {
      setupMock({ ...mockLogData, total: 50, pages: 2 });
      renderPage();
      await waitFor(() =>
        expect(
          screen.getByRole("navigation", { name: /pagination/i }),
        ).toBeInTheDocument(),
      );
    });

    it("does not show pagination on a single page", async () => {
      setupMock(mockLogData);
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("update")).toBeInTheDocument(),
      );
      expect(
        screen.queryByRole("navigation", { name: /pagination/i }),
      ).not.toBeInTheDocument();
    });
  });

  // ── CSV export ───────────────────────────────────────────────────────────────

  describe("CSV export", () => {
    it("renders Export CSV button", () => {
      setupMock();
      renderPage();
      expect(
        screen.getByRole("button", { name: /export csv/i }),
      ).toBeInTheDocument();
    });

    it("Export CSV is disabled while loading", () => {
      setupMock();
      renderPage();
      expect(
        screen.getByRole("button", { name: /export csv/i }),
      ).toBeDisabled();
    });

    it("Export CSV is enabled after data loads", async () => {
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /export csv/i }),
        ).not.toBeDisabled(),
      );
    });

    it("Export CSV is disabled when rows are empty", async () => {
      setupMock(mockEmpty);
      renderPage();
      await waitFor(() =>
        expect(screen.getByText(/no log entries found/i)).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("button", { name: /export csv/i }),
      ).toBeDisabled();
    });

    it("calls exportToCsv with correct headers and row data", async () => {
      const exportSpy = vi.spyOn(exportCsvModule, "exportToCsv");
      setupMock();
      renderPage();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /export csv/i }),
        ).not.toBeDisabled(),
      );
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: /export csv/i }));
      expect(exportSpy).toHaveBeenCalledWith(
        "audit-log.csv",
        [
          "Date/Time",
          "User",
          "Action",
          "Resource",
          "Resource ID",
          "Field",
          "Before",
          "After",
        ],
        expect.arrayContaining([
          expect.arrayContaining([
            "admin@example.com",
            "update",
            "ContactPathway",
            "status",
          ]),
        ]),
      );
    });
  });
});
