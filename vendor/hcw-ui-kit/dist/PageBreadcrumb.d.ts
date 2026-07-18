import type { ElementType } from "react";
export type Crumb = {
    label: string;
    to?: string;
};
export declare function PageBreadcrumb({ items, linkComponent, linkPropName, "aria-label": ariaLabel, }: {
    items: Crumb[];
    /** Component used for link crumbs (e.g. react-router `Link`). */
    linkComponent?: ElementType;
    /** Prop the link component expects for its target (`href` | `to`). */
    linkPropName?: "href" | "to";
    "aria-label"?: string;
}): import("react").JSX.Element | null;
export default PageBreadcrumb;
