import { SeriesRenderer, RenderContext } from './SeriesRenderer';

/**
 * Renderer for Pine Script line.* drawing objects.
 * Each line is defined by two endpoints (x1,y1) → (x2,y2) with optional
 * extend, dash style, and arrow heads.
 *
 * Style name: 'drawing_line' (distinct from 'line' used by plot()).
 */
export class DrawingLineRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, dataIndexOffset } = context;
        const offset = dataIndexOffset || 0;
        const defaultColor = '#2962ff';

        // Collect all non-null, non-deleted line objects from the sparse dataArray.
        // Drawing objects are stored as an array of all lines in a single data entry
        // (since multiple objects at the same bar would overwrite each other in the
        // sparse array). Handle both array-of-objects and single-object entries.
        const lineObjects: any[] = [];
        const lineData: number[][] = [];

        for (let i = 0; i < dataArray.length; i++) {
            const val = dataArray[i];
            if (!val) continue;

            const items = Array.isArray(val) ? val : [val];
            for (const ln of items) {
                if (ln && typeof ln === 'object' && !ln._deleted) {
                    lineObjects.push(ln);
                    // Apply padding offset for bar_index-based coordinates
                    const xOff = ln.xloc === 'bar_index' ? offset : 0;
                    lineData.push([ln.x1 + xOff, ln.y1, ln.x2 + xOff, ln.y2]);
                }
            }
        }

        if (lineData.length === 0) {
            return { name: seriesName, type: 'custom', xAxisIndex, yAxisIndex, data: [], silent: true };
        }

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex,
            yAxisIndex,
            renderItem: (params: any, api: any) => {
                const idx = params.dataIndex;
                const ln = lineObjects[idx];
                if (!ln || ln._deleted) return;

                const x1 = api.value(0);
                const y1 = api.value(1);
                const x2 = api.value(2);
                const y2 = api.value(3);

                let p1 = api.coord([x1, y1]);
                let p2 = api.coord([x2, y2]);

                // Handle extend (none | left | right | both)
                const extend = ln.extend || 'none';
                if (extend !== 'none') {
                    const cs = params.coordSys;
                    const left = cs.x;
                    const right = cs.x + cs.width;
                    const top = cs.y;
                    const bottom = cs.y + cs.height;
                    [p1, p2] = this.extendLine(p1, p2, extend, left, right, top, bottom);
                }

                const children: any[] = [];
                const color = ln.color || defaultColor;
                const lineWidth = ln.width || 1;

                // Main line segment
                children.push({
                    type: 'line',
                    shape: { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] },
                    style: {
                        stroke: color,
                        lineWidth: lineWidth,
                        lineDash: this.getDashPattern(ln.style),
                    },
                });

                // Arrow heads based on style
                const style = ln.style || 'style_solid';
                if (style === 'style_arrow_left' || style === 'style_arrow_both') {
                    const arrow = this.arrowHead(p2, p1, lineWidth, color);
                    if (arrow) children.push(arrow);
                }
                if (style === 'style_arrow_right' || style === 'style_arrow_both') {
                    const arrow = this.arrowHead(p1, p2, lineWidth, color);
                    if (arrow) children.push(arrow);
                }

                return { type: 'group', children };
            },
            data: lineData,
            z: 15,
            silent: true,
            emphasis: { disabled: true },
        };
    }

    private getDashPattern(style: string): number[] | undefined {
        switch (style) {
            case 'style_dotted':
                return [2, 2];
            case 'style_dashed':
                return [6, 4];
            default:
                return undefined;
        }
    }

    private extendLine(
        p1: number[],
        p2: number[],
        extend: string,
        left: number,
        right: number,
        top: number,
        bottom: number,
    ): [number[], number[]] {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];

        if (dx === 0 && dy === 0) return [p1, p2];

        const extendPoint = (origin: number[], dir: number[]): number[] => {
            let tMax = Infinity;
            if (dir[0] !== 0) {
                const tx = dir[0] > 0 ? (right - origin[0]) / dir[0] : (left - origin[0]) / dir[0];
                tMax = Math.min(tMax, tx);
            }
            if (dir[1] !== 0) {
                const ty = dir[1] > 0 ? (bottom - origin[1]) / dir[1] : (top - origin[1]) / dir[1];
                tMax = Math.min(tMax, ty);
            }
            if (!isFinite(tMax)) tMax = 0;
            return [origin[0] + tMax * dir[0], origin[1] + tMax * dir[1]];
        };

        let newP1 = p1;
        let newP2 = p2;

        if (extend === 'right' || extend === 'both') {
            newP2 = extendPoint(p1, [dx, dy]);
        }
        if (extend === 'left' || extend === 'both') {
            newP1 = extendPoint(p2, [-dx, -dy]);
        }

        return [newP1, newP2];
    }

    private arrowHead(from: number[], to: number[], lineWidth: number, color: string): any {
        const dx = to[0] - from[0];
        const dy = to[1] - from[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return null;

        const size = Math.max(8, lineWidth * 4);
        const nx = dx / len;
        const ny = dy / len;

        // Arrow tip at `to`, base offset back by `size`
        const bx = to[0] - nx * size;
        const by = to[1] - ny * size;

        // Perpendicular offset for arrowhead width
        const px = -ny * size * 0.4;
        const py = nx * size * 0.4;

        return {
            type: 'polygon',
            shape: {
                points: [
                    [to[0], to[1]],
                    [bx + px, by + py],
                    [bx - px, by - py],
                ],
            },
            style: { fill: color },
        };
    }
}
