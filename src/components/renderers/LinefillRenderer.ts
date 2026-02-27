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
        const fillData: number[][] = [];

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

                // Store all 8 coordinates for the two lines
                const xOff1 = line1.xloc === 'bar_index' ? offset : 0;
                const xOff2 = line2.xloc === 'bar_index' ? offset : 0;
                fillData.push([
                    line1.x1 + xOff1, line1.y1,
                    line1.x2 + xOff1, line1.y2,
                    line2.x1 + xOff2, line2.y1,
                    line2.x2 + xOff2, line2.y2,
                ]);
            }
        }

        if (fillData.length === 0) {
            return { name: seriesName, type: 'custom', xAxisIndex, yAxisIndex, data: [], silent: true };
        }

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex,
            yAxisIndex,
            renderItem: (params: any, api: any) => {
                const idx = params.dataIndex;
                const lf = fillObjects[idx];
                if (!lf || lf._deleted) return;

                const line1 = lf.line1;
                const line2 = lf.line2;
                if (!line1 || !line2 || line1._deleted || line2._deleted) return;

                // Get data values: line1 start, line1 end, line2 start, line2 end
                const l1x1 = api.value(0);
                const l1y1 = api.value(1);
                const l1x2 = api.value(2);
                const l1y2 = api.value(3);
                const l2x1 = api.value(4);
                const l2y1 = api.value(5);
                const l2x2 = api.value(6);
                const l2y2 = api.value(7);

                // Convert to pixel coordinates
                let p1Start = api.coord([l1x1, l1y1]);
                let p1End = api.coord([l1x2, l1y2]);
                let p2Start = api.coord([l2x1, l2y1]);
                let p2End = api.coord([l2x2, l2y2]);

                // Handle line extensions — if lines are extended, extend the fill too
                const extend1 = line1.extend || 'none';
                const extend2 = line2.extend || 'none';
                if (extend1 !== 'none' || extend2 !== 'none') {
                    const cs = params.coordSys;
                    const left = cs.x;
                    const right = cs.x + cs.width;
                    const top = cs.y;
                    const bottom = cs.y + cs.height;

                    if (extend1 !== 'none') {
                        [p1Start, p1End] = this.extendLine(p1Start, p1End, extend1, left, right, top, bottom);
                    }
                    if (extend2 !== 'none') {
                        [p2Start, p2End] = this.extendLine(p2Start, p2End, extend2, left, right, top, bottom);
                    }
                }

                // Parse color
                const { color: fillColor, opacity: fillOpacity } = ColorUtils.parseColor(lf.color || 'rgba(128, 128, 128, 0.2)');

                // Create a polygon: line1.start → line1.end → line2.end → line2.start
                return {
                    type: 'polygon',
                    shape: {
                        points: [
                            p1Start,
                            p1End,
                            p2End,
                            p2Start,
                        ],
                    },
                    style: {
                        fill: fillColor,
                        opacity: fillOpacity,
                    },
                    silent: true,
                };
            },
            data: fillData,
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
