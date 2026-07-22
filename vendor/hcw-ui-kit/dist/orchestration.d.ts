import type { ReactNode } from "react";
export declare function MissionHeader({ title, status, }: {
    /** One-sentence mission. */
    title: ReactNode;
    status?: ReactNode;
}): import("react").JSX.Element;
export type ObjectiveItem = {
    id: string;
    label: ReactNode;
    done?: boolean;
};
export declare function ObjectiveList({ items, "aria-label": ariaLabel, }: {
    items: ObjectiveItem[];
    "aria-label"?: string;
}): import("react").JSX.Element | null;
export declare function PhaseStrip({ phase, progress, eta, }: {
    /** Current phase label (free string — product owns the enum). */
    phase: ReactNode;
    /** 0–1 fraction, or custom node. */
    progress?: number | ReactNode;
    eta?: ReactNode;
}): import("react").JSX.Element;
export type ConfidenceLevel = "low" | "medium" | "high";
export declare function ConfidenceBand({ band, label, }: {
    band: ConfidenceLevel;
    /** Override band word; never use false-precision % alone (TRUST). */
    label?: ReactNode;
}): import("react").JSX.Element;
export type DecisionCardProps = {
    id: string;
    question: ReactNode;
    recommendation: ReactNode;
    /** ≤ {@link CAPACITY.decisionAlternatives} alternatives (enforced). */
    alternatives?: ReactNode[];
    impact?: ReactNode;
    timeToDecide?: ReactNode;
    /** Marks the recommended path visually. */
    recommended?: boolean;
    /** Called when the operator opens / focuses the decision (telemetry). */
    onOpen?: () => void;
};
export declare function DecisionCard({ id, question, recommendation, alternatives, impact, timeToDecide, recommended, onOpen, }: DecisionCardProps): import("react").JSX.Element;
export declare function DecisionQueue({ items, empty, }: {
    items: DecisionCardProps[];
    empty?: ReactNode;
}): import("react").JSX.Element | null;
export type FrozenDecision = {
    id: string;
    label: ReactNode;
    value: ReactNode;
};
export declare function FrozenDecisionRow({ label, value }: Omit<FrozenDecision, "id">): import("react").JSX.Element;
export declare function FreezeTable({ items, caption, }: {
    items: FrozenDecision[];
    caption?: string;
}): import("react").JSX.Element | null;
//# sourceMappingURL=orchestration.d.ts.map