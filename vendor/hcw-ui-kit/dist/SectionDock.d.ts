export type SectionDockLink = {
    href: string;
    label: string;
};
export declare function SectionDock({ links, pathname, hash, className, "aria-label": ariaLabel, }: {
    links: readonly SectionDockLink[];
    pathname: string;
    hash?: string;
    className?: string;
    "aria-label"?: string;
}): import("react").JSX.Element | null;
export default SectionDock;
//# sourceMappingURL=SectionDock.d.ts.map