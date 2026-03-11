import { SeriesRenderer, RenderContext } from './SeriesRenderer';
import { ColorUtils } from '../../utils/ColorUtils';

/**
 * Renderer for Pine Script polyline.* drawing objects.
 * Each polyline is defined by an array of chart.point objects, connected
 * sequentially with straight or curved segments, optionally closed and filled.
 *
 * Style name: 'drawing_polyline'
 */
export class PolylineRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, dataIndexOffset } = context;
        const offset = dataIndexOffset || 0;

        // Collect all non-deleted polyline objects from the sparse dataArray.
        // Same aggregation pattern as DrawingLineRenderer — objects are stored
        // as an array in a single data entry.
        const polyObjects: any[] = [];

        for (let i = 0; i < dataArray.length; i++) {
            const val = dataArray[i];
            if (!val) continue;

            const items = Array.isArray(val) ? val : [val];
            for (const pl of items) {
                if (pl && typeof pl === 'object' && !pl._deleted && pl.points && pl.points.length >= 2) {
                    polyObjects.push(pl);
                }
            }
        }

        if (polyObjects.length === 0) {
            return { name: seriesName, type: 'custom', xAxisIndex, yAxisIndex, data: [], silent: true };
        }

        // Use a SINGLE data entry spanning the full x-range so renderItem is always called.
        // ECharts filters a data item only when ALL its x-dimensions are on the same side
        // of the visible window.  With dims 0=0 and 1=lastBar the item always straddles
        // the viewport, so renderItem fires exactly once regardless of scroll position.
        // Note: We do NOT encode y-dimensions — drawing objects should not influence the
        // y-axis auto-scaling.
        const totalBars = (context.candlestickData?.length || 0) + offset;
        const lastBarIndex = Math.max(0, totalBars - 1);

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex,
            yAxisIndex,
            renderItem: (params: any, api: any) => {
                const children: any[] = [];

                for (const pl of polyObjects) {
                    if (pl._deleted) continue;
                    const points = pl.points;
                    if (!points || points.length < 2) continue;

                    const useBi = pl.xloc === 'bi' || pl.xloc === 'bar_index';
                    const xOff = useBi ? offset : 0;

                    // Convert chart.point objects to pixel coordinates
                    const pixelPoints: number[][] = [];
                    for (const pt of points) {
                        const x = useBi ? (pt.index ?? 0) + xOff : (pt.time ?? 0);
                        const y = pt.price ?? 0;
                        pixelPoints.push(api.coord([x, y]));
                    }

                    if (pixelPoints.length < 2) continue;

                    // Detect na/NaN line_color (means no stroke)
                    const rawLineColor = pl.line_color;
                    const isNaLineColor = rawLineColor === null || rawLineColor === undefined ||
                        (typeof rawLineColor === 'number' && isNaN(rawLineColor)) ||
                        rawLineColor === 'na' || rawLineColor === 'NaN';
                    const lineColor = isNaLineColor ? null : (rawLineColor || '#2962ff');
                    const lineWidth = pl.line_width || 1;
                    const dashPattern = this.getDashPattern(pl.line_style);

                    // Fill shape (rendered behind stroke)
                    if (pl.fill_color && pl.fill_color !== '' && pl.fill_color !== 'na') {
                        const { color: fillColor, opacity: fillOpacity } = ColorUtils.parseColor(pl.fill_color);

                        if (pl.curved) {
                            const pathData = this.buildCurvedPath(pixelPoints, pl.closed);
                            children.push({
                                type: 'path',
                                shape: { pathData: pathData + ' Z' },
                                style: { fill: fillColor, opacity: fillOpacity, stroke: 'none' },
                                silent: true,
                            });
                        } else {
                            children.push({
                                type: 'polygon',
                                shape: { points: pixelPoints },
                                style: { fill: fillColor, opacity: fillOpacity, stroke: 'none' },
                                silent: true,
                            });
                        }
                    }

                    // Stroke (line segments) — skip entirely if line_color is na
                    if (lineColor && lineWidth > 0) {
                        if (pl.curved) {
                            const pathData = this.buildCurvedPath(pixelPoints, pl.closed);
                            children.push({
                                type: 'path',
                                shape: { pathData },
                                style: { fill: 'none', stroke: lineColor, lineWidth, lineDash: dashPattern },
                                silent: true,
                            });
                        } else {
                            const allPoints = pl.closed ? [...pixelPoints, pixelPoints[0]] : pixelPoints;
                            children.push({
                                type: 'polyline',
                                shape: { points: allPoints },
                                style: { fill: 'none', stroke: lineColor, lineWidth, lineDash: dashPattern },
                                silent: true,
                            });
                        }
                    }
                }

                return { type: 'group', children };
            },
            data: [[0, lastBarIndex]],
            clip: true,
            encode: { x: [0, 1] },
            // Prevent ECharts visual system from overriding element colors with palette
            itemStyle: { color: 'transparent', borderColor: 'transparent' },
            z: 15,
            silent: true,
            emphasis: { disabled: true },
        };
    }

    /**
     * Build an SVG path string for a smooth curve through all points
     * using Catmull-Rom → cubic bezier conversion.
     */
    private buildCurvedPath(points: number[][], closed: boolean): string {
        const n = points.length;
        if (n < 2) return '';
        if (n === 2) {
            return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
        }

        // Catmull-Rom tension (0.5 = centripetal)
        const tension = 0.5;
        let path = `M ${points[0][0]} ${points[0][1]}`;

        // For closed curves, wrap around; for open, duplicate first/last
        const getPoint = (i: number): number[] => {
            if (closed) {
                return points[((i % n) + n) % n];
            }
            if (i < 0) return points[0];
            if (i >= n) return points[n - 1];
            return points[i];
        };

        const segmentCount = closed ? n : n - 1;

        for (let i = 0; i < segmentCount; i++) {
            const p0 = getPoint(i - 1);
            const p1 = getPoint(i);
            const p2 = getPoint(i + 1);
            const p3 = getPoint(i + 2);

            // Convert Catmull-Rom to cubic bezier control points
            const cp1x = p1[0] + (p2[0] - p0[0]) * tension / 3;
            const cp1y = p1[1] + (p2[1] - p0[1]) * tension / 3;
            const cp2x = p2[0] - (p3[0] - p1[0]) * tension / 3;
            const cp2y = p2[1] - (p3[1] - p1[1]) * tension / 3;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
        }

        if (closed) {
            path += ' Z';
        }

        return path;
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
}
