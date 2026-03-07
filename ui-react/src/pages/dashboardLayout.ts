import type { ViewItem } from "../types/config";

export interface GridNodeLayout {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

function overlaps(a: GridNodeLayout, b: GridNodeLayout): boolean {
    const horizontal = a.x < b.x + b.w && a.x + a.w > b.x;
    const vertical = a.y < b.y + b.h && a.y + a.h > b.y;
    return horizontal && vertical;
}

function settleWithoutOverlap(
    candidate: GridNodeLayout,
    placed: GridNodeLayout[],
): GridNodeLayout {
    const settled = { ...candidate };
    while (placed.some((node) => overlaps(settled, node))) {
        settled.y += 1;
    }
    return settled;
}

export function mergeViewItemsWithGridNodes(
    items: ViewItem[],
    nodes: GridNodeLayout[],
): ViewItem[] {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const placed: GridNodeLayout[] = [];

    return items.map((item) => {
        const fromNode = nodeMap.get(item.id);
        const candidate: GridNodeLayout = fromNode
            ? {
                  id: item.id,
                  x: fromNode.x,
                  y: fromNode.y,
                  w: fromNode.w,
                  h: fromNode.h,
              }
            : {
                  id: item.id,
                  x: item.x,
                  y: item.y,
                  w: item.w,
                  h: item.h,
              };

        const settled = settleWithoutOverlap(candidate, placed);
        placed.push(settled);

        return {
            ...item,
            x: settled.x,
            y: settled.y,
            w: settled.w,
            h: settled.h,
        };
    });
}

export function hasLayoutOverlap(items: Array<Pick<ViewItem, "x" | "y" | "w" | "h">>): boolean {
    for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
            const a: GridNodeLayout = { id: "a", ...items[i] };
            const b: GridNodeLayout = { id: "b", ...items[j] };
            if (overlaps(a, b)) {
                return true;
            }
        }
    }
    return false;
}
