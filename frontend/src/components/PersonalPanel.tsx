import {
  Button,
  InlineLoading,
  InlineNotification,
  ProgressBar,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TextInput,
  Tile,
} from "@carbon/react";
import { Asleep, Close, Light } from "@carbon/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TASK_PRIORITY_LABEL } from "@esti/contracts";
import { trpc } from "../lib/trpc.js";
import {
  fmtPomTime,
  POMODORO_DURATIONS,
  POMODORO_MODE_LABEL,
  POMODORO_MODE_TAG,
  usePomodoro,
  type PomodoroMode,
} from "../contexts/PomodoroContext.js";

// ─── Pomodoro ─────────────────────────────────────────────────────────────────

function PomodoroSection() {
  const pom = usePomodoro();
  const pct =
    ((POMODORO_DURATIONS[pom.mode] - pom.timeLeft) / POMODORO_DURATIONS[pom.mode]) * 100;

  return (
    <Stack gap={4}>
      <Stack orientation="horizontal" gap={2}>
        {(["work", "short", "long"] as PomodoroMode[]).map((m) => (
          <Button
            key={m}
            kind={pom.mode === m ? "primary" : "ghost"}
            size="sm"
            onClick={() => pom.switchMode(m)}
          >
            {POMODORO_MODE_LABEL[m]}
          </Button>
        ))}
      </Stack>
      <Stack gap={2}>
        <Tag type={POMODORO_MODE_TAG[pom.mode]} size="sm">
          {POMODORO_MODE_LABEL[pom.mode]}
        </Tag>
        <h1>{fmtPomTime(pom.timeLeft)}</h1>
        <ProgressBar label={POMODORO_MODE_LABEL[pom.mode]} value={pct} max={100} hideLabel />
      </Stack>
      <Stack orientation="horizontal" gap={3}>
        <Button kind="primary" size="sm" onClick={pom.toggle}>
          {pom.running
            ? "Pause"
            : pom.timeLeft === POMODORO_DURATIONS[pom.mode]
              ? "Start"
              : "Resume"}
        </Button>
        <Button kind="ghost" size="sm" onClick={pom.reset}>
          Reset
        </Button>
      </Stack>
      {pom.sessions > 0 && (
        <p>
          {pom.sessions} session{pom.sessions !== 1 ? "s" : ""} completed today
        </p>
      )}
    </Stack>
  );
}

// ─── Calculator ───────────────────────────────────────────────────────────────

function CalculatorSection({
  expr,
  setExpr,
}: {
  expr: string;
  setExpr: (v: string) => void;
}) {
  const result = safeEval(expr);

  return (
    <Stack gap={4}>
      <TextInput
        id="panel-calc-screen"
        labelText="Calculator"
        hideLabel
        size="lg"
        placeholder="e.g. (1200×2.5)+18%"
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && result !== null) setExpr(formatCalcNum(result));
        }}
      />
      {result === null && expr.trim() ? (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Invalid expression"
        />
      ) : (
        <Tile>
          <h3>{expr.trim() === "" ? "0" : `= ${formatCalcNum(result ?? 0)}`}</h3>
        </Tile>
      )}
      <p>+ − × ÷ ( ) % · Enter to reuse result</p>
      <Button kind="ghost" size="sm" onClick={() => setExpr("")}>
        Clear
      </Button>
    </Stack>
  );
}

// ─── My Tasks ─────────────────────────────────────────────────────────────────

const PRIORITY_TAG: Record<string, "red" | "magenta" | "blue" | "gray"> = {
  CRITICAL: "red",
  HIGH: "magenta",
  MEDIUM: "blue",
  LOW: "gray",
};

function MyTasksSection() {
  const navigate = useNavigate();
  const tasksQ = trpc.tasks.list.useQuery({ myTasks: true });
  const today = new Date().toISOString().slice(0, 10);
  const open = (tasksQ.data ?? []).filter((t) => t.status !== "DONE");
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
  const shown = open.slice(0, 3);

  return (
    <Stack gap={4}>
      <Stack orientation="horizontal" gap={3}>
        <p>Open tasks</p>
        {!tasksQ.isLoading && (
          <Tag type={overdue.length > 0 ? "red" : "blue"} size="sm">
            {open.length} open
          </Tag>
        )}
      </Stack>

      {tasksQ.isLoading ? (
        <InlineLoading description="Loading tasks…" />
      ) : open.length === 0 ? (
        <p>No open tasks assigned to you.</p>
      ) : (
        <Stack gap={3}>
          {shown.map((t) => {
            const isOverdue = t.dueDate ? t.dueDate < today : false;
            return (
              <Stack key={t.id} orientation="horizontal" gap={2}>
                <div className="esti-grow">
                  <p>{t.title}</p>
                  {t.projectRef && <p>{t.projectRef}</p>}
                </div>
                <Stack gap={1}>
                  <Tag type={PRIORITY_TAG[t.priority] ?? "gray"} size="sm">
                    {TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
                  </Tag>
                  {isOverdue && (
                    <Tag type="red" size="sm">
                      Overdue
                    </Tag>
                  )}
                  {t.status === "IN_PROGRESS" && (
                    <Tag type="teal" size="sm">
                      Active
                    </Tag>
                  )}
                </Stack>
              </Stack>
            );
          })}
          {open.length > 3 && <p>+{open.length - 3} more in Work module</p>}
        </Stack>
      )}

      <Button kind="ghost" size="sm" onClick={() => navigate("/tasks?tab=tasks")}>
        Open Work module
      </Button>
    </Stack>
  );
}

// ─── Leaves ───────────────────────────────────────────────────────────────────

function LeavesSection() {
  const meQ = trpc.dashboard.me.useQuery();
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const navigate = useNavigate();
  const leave = meQ.data?.leave;

  return (
    <Stack gap={4}>
      <p>Leave balance</p>

      {meQ.isLoading ? (
        <InlineLoading description="Loading…" />
      ) : !leave ? (
        <p>No leave record linked to your login.</p>
      ) : (
        <Stack gap={4}>
          <Stack orientation="horizontal" gap={4}>
            <Stack gap={1}>
              <p>Remaining</p>
              <h2>{leave.remaining}</h2>
              <Tag type="green" size="sm">Days left</Tag>
            </Stack>
            <Stack gap={1}>
              <p>Used</p>
              <h2>{leave.used}</h2>
              <Tag type="gray" size="sm">This year</Tag>
            </Stack>
            <Stack gap={1}>
              <p>Total</p>
              <h2>{leave.allowance}</h2>
              <Tag type="blue" size="sm">Allowance</Tag>
            </Stack>
          </Stack>
          <ProgressBar
            label="Leave used"
            value={leave.used}
            max={leave.allowance}
            helperText={`${leave.used} of ${leave.allowance} days taken`}
          />
        </Stack>
      )}

      {hrEnabled && (
        <Button kind="ghost" size="sm" onClick={() => navigate("/hr")}>
          Open HR module
        </Button>
      )}
    </Stack>
  );
}

// ─── PersonalPanel ────────────────────────────────────────────────────────────

type ThemeName = "white" | "g100";

export function PersonalPanel({
  isOpen,
  onClose,
  userName,
  theme,
  onToggleTheme,
}: {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  theme: ThemeName;
  onToggleTheme: () => void;
}) {
  // Calculator expression lifted here so it survives tab switches.
  const [calcExpr, setCalcExpr] = useState("");

  if (!isOpen) return null;

  const now = new Date();
  const welcomeDay = now.toLocaleDateString("en-IN", { weekday: "long" });
  const welcomeDate = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const firstName = userName ? userName.split(" ")[0] : undefined;
  const greeting = firstName ? `Welcome, Ar. ${firstName}` : "Welcome";

  return (
    <div className="esti-personal-panel esti-panel-shell">
      <Tile className="esti-fill">
        {/* Welcome header — fixed height, does not scroll */}
        <div className="esti-pp-header">
          <Stack orientation="horizontal" gap={3}>
            <div className="esti-grow">
              <p>{greeting}</p>
              <p>
                {welcomeDay}, {welcomeDate}
              </p>
            </div>
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              renderIcon={theme === "white" ? Asleep : Light}
              iconDescription={
                theme === "white" ? "Switch to dark theme" : "Switch to light theme"
              }
              onClick={onToggleTheme}
            />
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              renderIcon={Close}
              iconDescription="Close panel"
              onClick={onClose}
            />
          </Stack>
        </div>

        {/* Tab area — fills remaining panel height, scrolls internally per tab */}
        <div className="esti-pp-tabs">
          <Tabs>
            <TabList aria-label="Personal panel tabs">
              <Tab>Focus</Tab>
              <Tab>Calc</Tab>
              <Tab>Tasks</Tab>
              <Tab>Leave</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <PomodoroSection />
              </TabPanel>
              <TabPanel>
                <CalculatorSection expr={calcExpr} setExpr={setCalcExpr} />
              </TabPanel>
              <TabPanel>
                <MyTasksSection />
              </TabPanel>
              <TabPanel>
                <LeavesSection />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      </Tile>
    </div>
  );
}

// ─── Calculator internals ─────────────────────────────────────────────────────

function safeEval(input: string): number | null {
  const expr = input.trim();
  if (!expr) return null;
  const s = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  const tokens = s.match(/(\d+\.?\d*|\.\d+|[+\-*/()%])/g);
  if (!tokens || tokens.join("") !== s.replace(/\s+/g, "")) return null;

  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const out: (number | string)[] = [];
  const ops: string[] = [];

  for (const t of tokens) {
    if (/^[\d.]/.test(t)) {
      const n = Number(t);
      if (!Number.isFinite(n)) return null;
      out.push(n);
    } else if (t === "%") {
      out.push("%");
    } else if (t === "(") {
      ops.push(t);
    } else if (t === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop()!);
      if (!ops.length) return null;
      ops.pop();
    } else {
      while (
        ops.length &&
        ops[ops.length - 1] !== "(" &&
        (prec[ops[ops.length - 1]!] ?? 0) >= prec[t]!
      )
        out.push(ops.pop()!);
      ops.push(t);
    }
  }
  while (ops.length) {
    const op = ops.pop()!;
    if (op === "(") return null;
    out.push(op);
  }

  const st: number[] = [];
  for (const t of out) {
    if (typeof t === "number") {
      st.push(t);
    } else if (t === "%") {
      const a = st.pop();
      if (a === undefined) return null;
      st.push(a / 100);
    } else {
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) return null;
      st.push(
        t === "+" ? a + b : t === "-" ? a - b : t === "*" ? a * b : a / b,
      );
    }
  }
  const r = st.pop();
  return st.length === 0 && r !== undefined && Number.isFinite(r) ? r : null;
}

function formatCalcNum(n: number): string {
  return String(Math.round(n * 1e8) / 1e8);
}
