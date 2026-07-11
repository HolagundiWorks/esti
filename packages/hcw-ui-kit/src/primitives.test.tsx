// @vitest-environment jsdom
/**
 * Render/contract tests for the structural + interaction primitives
 * (Component Quality Checklist — behaviour/contract tests). Complements
 * components.test.tsx (the promoted primitives). jsdom only.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Surface } from "./Surface.js";
import { BrandMark } from "./BrandMark.js";
import { HealthGlassOrb, type HealthZoneState } from "./HealthGlassOrb.js";
import {
  ActionDock,
  ActionDockProvider,
  useScreenActions,
  type DockAction,
} from "./ActionDock.js";

afterEach(cleanup);

describe("Surface", () => {
  it("renders children and the kit class, forwarding Box props", () => {
    render(
      <Surface layer="soft" data-testid="s" aria-label="panel">
        <span>inside</span>
      </Surface>,
    );
    const el = screen.getByTestId("s");
    expect(el.className).toContain("hcw-surface");
    expect(el.getAttribute("aria-label")).toBe("panel");
    expect(within(el).getByText("inside")).toBeTruthy();
  });

  it("defaults to the flat layer when none is given", () => {
    render(<Surface data-testid="s2">x</Surface>);
    expect(screen.getByTestId("s2").className).toContain("hcw-surface");
  });
});

describe("BrandMark", () => {
  it("renders the default wordmark with an aria-hidden accent mark", () => {
    const { container } = render(<BrandMark />);
    expect(screen.getByText("AORMS")).toBeTruthy();
    expect(container.querySelector("[aria-hidden]")).toBeTruthy();
  });

  it("drops the accent mark when accent is false", () => {
    const { container } = render(<BrandMark accent={false} label="AORMS Estimate" />);
    expect(screen.getByText("AORMS Estimate")).toBeTruthy();
    expect(container.querySelector("[aria-hidden]")).toBeNull();
  });
});

describe("HealthGlassOrb — shape encodes severity (WCAG 1.4.1)", () => {
  const shapeFor: Record<HealthZoneState, "circle" | "polygon" | "rect"> = {
    stable: "circle",
    watch: "polygon",
    friction: "polygon",
    critical: "rect",
    inactive: "circle",
  };

  it.each(Object.keys(shapeFor) as HealthZoneState[])(
    "flat variant draws the %s shape, not colour alone",
    (state) => {
      const { container } = render(<HealthGlassOrb state={state} variant="flat" />);
      const img = screen.getByRole("img");
      expect(img.getAttribute("aria-label")).toBe(`Health: ${state}`);
      expect(container.querySelector(shapeFor[state])).toBeTruthy();
    },
  );

  it("glass variant carries the state modifier classes + accessible name", () => {
    render(<HealthGlassOrb state="critical" />);
    const img = screen.getByRole("img");
    expect(img.className).toContain("hcw-health-glass-orb--critical");
    expect(img.className).toContain("esti-zone-glass-orb--critical");
    expect(img.getAttribute("aria-label")).toBe("Health: critical");
  });

  it("an explicit title overrides the derived label", () => {
    render(<HealthGlassOrb state="watch" title="Financial zone" />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Financial zone");
  });
});

describe("ActionDock + useScreenActions (the interaction contract)", () => {
  function Harness({ actions }: { actions: DockAction[] }) {
    useScreenActions(actions, [actions]);
    return <ActionDock />;
  }
  const render_ = (actions: DockAction[]) =>
    render(
      <ActionDockProvider>
        <Harness actions={actions} />
      </ActionDockProvider>,
    );

  it("renders published actions in a labelled toolbar", () => {
    render_([{ id: "save", label: "Save", zone: "right", onClick: () => {} }]);
    const bar = screen.getByRole("toolbar", { name: "Screen actions" });
    expect(within(bar).getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("orders buttons left → center → right regardless of publish order", () => {
    render_([
      { id: "save", label: "Save", zone: "right", onClick: () => {} },
      { id: "del", label: "Delete", zone: "left", tone: "danger", onClick: () => {} },
      { id: "new", label: "New", zone: "center", tone: "primary", onClick: () => {} },
    ]);
    const names = screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual(["Delete", "New", "Save"]);
  });

  it("renders nothing when the screen publishes an empty action set", () => {
    render_([]);
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("invokes onClick and disables the disabled action", () => {
    const onClick = vi.fn();
    render_([
      { id: "go", label: "Go", zone: "center", onClick },
      { id: "stop", label: "Stop", zone: "right", disabled: true, onClick: () => {} },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("uses a roving tabindex — one Tab stop into the toolbar", () => {
    render_([
      { id: "a", label: "A", zone: "left", onClick: () => {} },
      { id: "b", label: "B", zone: "right", onClick: () => {} },
    ]);
    const a = screen.getByRole("button", { name: "A" });
    const b = screen.getByRole("button", { name: "B" });
    const zero = [a, b].filter((el) => el.getAttribute("tabindex") === "0");
    expect(zero).toHaveLength(1);
    expect(a.getAttribute("tabindex")).toBe("0"); // first enabled = active
    expect(b.getAttribute("tabindex")).toBe("-1");
  });

  it("clears the dock when the publishing screen unmounts", () => {
    const { unmount } = render_([{ id: "x", label: "X", zone: "right", onClick: () => {} }]);
    expect(screen.getByRole("toolbar")).toBeTruthy();
    unmount();
    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});
