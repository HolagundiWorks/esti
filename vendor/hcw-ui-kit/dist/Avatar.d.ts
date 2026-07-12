export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
/** Initials from a display name — first + last word, letters only. */
export declare function getInitials(name: string): string;
export declare function Avatar({ name, photoUrl, color, size, className, }: {
    name: string;
    photoUrl?: string | null;
    /** Background colour behind initials — injected by the caller. */
    color?: string;
    size?: AvatarSize;
    className?: string;
}): import("react").JSX.Element;
export default Avatar;
//# sourceMappingURL=Avatar.d.ts.map