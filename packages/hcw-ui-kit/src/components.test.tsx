// @vitest-environment jsdom
/**
 * Render tests for the promoted primitives (Component Quality Checklist —
 * "Unit tests (behaviour/contract)"). jsdom only; visual-regression snapshots
 * are tracked separately (debt D2b).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { forwardRef, type ReactNode } from "react";
import { Avatar, getInitials } from "./Avatar.js";
import { ConfirmModal } from "./ConfirmModal.js";
import { DataState } from "./DataState.js";
import { PageBreadcrumb } from "./PageBreadcrumb.js";
import { StatusDot } from "./StatusDot.js";
import { ToastHost, pushToast, resetToasts } from "./Toast.js";

afterEach(cleanup);

describe("StatusDot", () => {
  it("renders the label as ink text with a decorative dot", () => {
    render(<StatusDot color="green" label="Active" />);
    expect(screen.getByText("Active")).toBeTruthy();
  });
});

describe("Avatar", () => {
  it("shows initials (first + last word) when no photo", () => {
    render(<Avatar name="Asha K. Rao" color="#333" />);
    expect(screen.getByText("AR")).toBeTruthy();
    expect(screen.getByLabelText("Asha K. Rao")).toBeTruthy();
  });

  it("renders the photo with the name as alt when provided", () => {
    render(<Avatar name="Vikram Iyer" photoUrl="/x.jpg" />);
    expect(screen.getByAltText("Vikram Iyer")).toBeTruthy();
  });

  it("getInitials handles single and empty names", () => {
    expect(getInitials("Meera")).toBe("M");
    expect(getInitials("  ")).toBe("?");
  });
});

describe("DataState", () => {
  it("shows the skeleton while loading (never children)", () => {
    const { container } = render(
      <DataState loading isEmpty={false} empty={{ title: "None" }}>
        <div data-testid="content" />
      </DataState>,
    );
    expect(screen.queryByTestId("content")).toBeNull();
    expect(container.querySelector(".MuiSkeleton-root")).toBeTruthy();
  });

  it("shows the one-sentence empty state with its action", () => {
    render(
      <DataState loading={false} isEmpty empty={{ title: "No invoices yet", action: <button>Create invoice</button> }}>
        <div data-testid="content" />
      </DataState>,
    );
    expect(screen.getByText("No invoices yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create invoice" })).toBeTruthy();
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("renders children when loaded and non-empty", () => {
    render(
      <DataState loading={false} isEmpty={false} empty={{ title: "None" }}>
        <div data-testid="content" />
      </DataState>,
    );
    expect(screen.getByTestId("content")).toBeTruthy();
  });
});

describe("ConfirmModal", () => {
  it("has an accessible name from its heading (WCAG 4.1.2)", () => {
    render(
      <ConfirmModal open heading="Delete invoice?" body="Gone forever." onConfirm={() => {}} onClose={() => {}} />,
    );
    expect(screen.getByRole("dialog", { name: "Delete invoice?" })).toBeTruthy();
  });

  it("fires onConfirm / onClose and disables the commit while pending", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <ConfirmModal open heading="Remove?" body="b" confirmText="Remove" onConfirm={onConfirm} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <ConfirmModal open heading="Remove?" body="b" pending onConfirm={onConfirm} onClose={onClose} />,
    );
    expect((screen.getByRole("button", { name: "Working…" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("PageBreadcrumb", () => {
  it("renders link crumbs through the injected component and the last crumb as text", () => {
    // Ref-forwarding like a real router Link (MUI's Link requires it).
    const Fake = forwardRef<HTMLAnchorElement, { to?: string; children?: ReactNode }>(
      function Fake({ to, children, ...rest }, ref) {
        return (
          <a ref={ref} data-testid="injected" data-to={to} {...rest}>{children}</a>
        );
      },
    );
    render(
      <PageBreadcrumb
        items={[{ label: "Library", to: "/library" }, { label: "Standards" }]}
        linkComponent={Fake}
        linkPropName="to"
      />,
    );
    const link = screen.getByTestId("injected");
    expect(link.getAttribute("data-to")).toBe("/library");
    // Last crumb is plain text (the current page), not a link.
    expect(screen.getByText("Standards").closest("a")).toBeNull();
  });

  it("renders nothing for an empty trail", () => {
    const { container } = render(<PageBreadcrumb items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("ToastHost", () => {
  beforeEach(() => resetToasts());

  it("renders pushed toasts in a polite live region and dismisses them", () => {
    render(<ToastHost />);
    act(() => {
      pushToast({ kind: "success", title: "Invoice sent" }, 0); // ttl 0 = no auto-dismiss timer
    });
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("Invoice sent")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByText("Invoice sent")).toBeNull();
  });
});
