import { SeriesRenderer, RenderContext } from './SeriesRenderer';
import { ColorUtils } from '../../utils/ColorUtils';

/**
 * Renderer for Pine Script linefill.* drawing objects.
 * Each linefill fills the area between two line objects as a polygon.
 *
 * Style name: 'linefill'
 */
export class LinefillRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, dataIndexOffset } = context;
        const offset = dataIndexOffset || 0;

        // Collect all non-deleted linefill objects from the sparse dataArray.
        // Same aggregation pattern as DrawingLineRenderer — objects are stored
        // as an array in a single data entry.
        const fillObjects: any[] = [];

        for (let i = 0; i < dataArray.length; i++) {
            const val = dataArray[i];
            if (!val) continue;

            const items = Array.isArray(val) ? val : [val];
            for (const lf of items) {
                if (!lf || typeof lf !== 'object' || lf._deleted) continue;

                const line1 = lf.line1;
                const line2 = lf.line2;
                if (!line1 || !line2 || line1._deleted || line2._deleted) continue;

                fillObjects.push(lf);
            }
        }

        if (fillObjects.length === 0) {
            return { name: seriesName, type: 'custom', xAxisIndex, yAxisIndex, data: [], silent: true };
        }

        // Compute y-range for axis scaling
        let yMin = Infinity, yMax = -Infinity;
        for (const lf of fillObjects) {
            for (const y of [lf.line1.y1, lf.line1.y2, lf.line2.y1, lf.line2.y2]) {
                if (y < yMin) yMin = y;
                if (y > yMax) yMax = y;
            }
        }

        // Use a SINGLE data entry spanning the full x-range so renderItem is always called.
        // ECharts filters a data item only when ALL its x-dimensions are on the same side
        // of the visible window.  With dims 0=0 and 1=lastBar the item always straddles
        // the viewport, so renderItem fires exactly once regardless of scroll position.
        // Dims 2/3 are yMin/yMax for axis scaling.
        const totalBars = (context.candlestickData?.length || 0) + offset;
        const lastBarIndex = Math.max(0, totalBars - 1);

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex,
            yAxisIndex,
            renderItem: (params: any, api: any) => {
                const children: any[] = [];

                for (const lf of fillObjects) {
                    if (lf._deleted) continue;
                    const line1 = lf.line1;
                    const line2 = lf.line2;
                    if (!line1 || !line2 || line1._deleted || line2._deleted) continue;

                    const xOff1 = (line1.xloc === 'bar_index' || line1.xloc === 'bi') ? offset : 0;
                    const xOff2 = (line2.xloc === 'bar_index' || line2.xloc === 'bi') ? offset : 0;

                    let p1Start = api.coord([line1.x1 + xOff1, line1.y1]);
                    let p1End = api.coord([line1.x2 + xOff1, line1.y2]);
                    let p2Start = api.coord([line2.x1 + xOff2, line2.y1]);
                    let p2End = api.coord([line2.x2 + xOff2, line2.y2]);

                    // Handle line extensions
                    const extend1 = line1.extend || 'none';
                    const extend2 = line2.extend || 'none';
                    if (extend1 !== 'none' || extend2 !== 'none') {
                        const cs = params.coordSys;
                        const csLeft = cs.x, csRight = cs.x + cs.width;
                        const csTop = cs.y, csBottom = cs.y + cs.height;
                        if (extend1 !== 'none') {
                            [p1Start, p1End] = this.extendLine(p1Start, p1End, extend1, csLeft, csRight, csTop, csBottom);
                        }
                        if (extend2 !== 'none') {
                            [p2Start, p2End] = this.extendLine(p2Start, p2End, extend2, csLeft, csRight, csTop, csBottom);
                        }
                    }

                    const { color: fillColor, opacity: fillOpacity } = ColorUtils.parseColor(lf.color || 'rgba(128, 128, 128, 0.2)');

                    children.push({
                        type: 'polygon',
                        shape: { points: [p1Start, p1End, p2End, p2Start] },
                        style: { fill: fillColor, opacity: fillOpacity },
                        silent: true,
                    });
                }

                return { type: 'group', children };
            },
            data: [[0, lastBarIndex, yMin, yMax]],
            clip: true,
            encode: { x: [0, 1], y: [2, 3] },
            z: 10, // Behind lines (z=15) but above other elements
            silent: true,
            emphasis: { disabled: true },
        };
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
}
