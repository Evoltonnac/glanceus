import { z } from "zod";
import type { ReactNode } from "react";

/**
 * Container Schema
 *
 * Vertical flow layout container that stacks child items from top to bottom.
 * Serves as the default base layout for widget cards or vertical sections.
 */
export const ContainerSchema = z.object({
    type: z.literal("Container"),
    items: z.array(z.any()), // Will be resolved by renderer recursively
    spacing: z.enum(["none", "small", "default", "large"]).default("default"),
    verticalAlignment: z.enum(["top", "center", "bottom"]).default("top"),
});

export type ContainerProps = z.infer<typeof ContainerSchema>;

const spacingMap = {
    none: "gap-0",
    small: "gap-2",
    default: "gap-4",
    large: "gap-6",
};

const alignmentMap = {
    top: "justify-start",
    center: "justify-center",
    bottom: "justify-end",
};

interface ContainerComponentProps {
    spacing?: "none" | "small" | "default" | "large";
    verticalAlignment?: "top" | "center" | "bottom";
    children: ReactNode;
}

export function Container({
    spacing = "default",
    verticalAlignment = "top",
    children,
}: ContainerComponentProps) {
    return (
        <div
            className={`flex flex-col w-full ${spacingMap[spacing as keyof typeof spacingMap]} ${alignmentMap[verticalAlignment as keyof typeof alignmentMap]}`}
        >
            {children}
        </div>
    );
}
