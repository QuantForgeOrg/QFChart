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

        // For each polyline, provide representative coordinate data so ECharts
        // includes the polyline's y-range in axis scaling. We store [x_first, y_min, x_last, y_max]
        // using actual point coordinates. renderItem accesses the full polyline via polyObjects[idx].
        const polyData: number[][] = [];
        for (const pl of polyObjects) {
            const pts = pl.points;
            const useBi = pl.xloc === 'bi' || pl.xloc === 'bar_index';
            const xOff = useBi ? offset : 0;
            const firstX = useBi ? (pts[0].index ?? 0) + xOff : (pts[0].time ?? 0);
            const lastX = useBi ? (pts[pts.length - 1].index ?? 0) + xOff : (pts[pts.length - 1].time ?? 0);
            let yMin = Infinity, yMax = -Infinity;
            for (const pt of pts) {
                const p = pt.price ?? 0;
                if (p < yMin) yMin = p;
                if (p > yMax) yMax = p;
            }
            polyData.push([firstX, yMin, lastX, yMax]);
        }

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex,
            yAxisIndex,
            renderItem: (params: any, api: any) => {
                const idx = params.dataIndex;
                const pl = polyObjects[idx];
                if (!pl || pl._deleted) return;

                const points = pl.points;
                if (!points || points.length < 2) return;

                const useBi = pl.xloc === 'bi' || pl.xloc === 'bar_index';
                const xOff = useBi ? offset : 0;

                // Convert chart.point objects to pixel coordinates
                const pixelPoints: number[][] = [];
                for (const pt of points) {
                    const x = useBi ? (pt.index ?? 0) + xOff : (pt.time ?? 0);
                    const y = pt.price ?? 0;
                    const px = api.coord([x, y]);
                    pixelPoints.push(px);
                }

                if (pixelPoints.length < 2) return;

                const children: any[] = [];
                const lineColor = pl.line_color || '#2962ff';
                const lineWidth = pl.line_width || 1;
                const dashPattern = this.getDashPattern(pl.line_style);

                // Fill shape (rendered behind stroke)
                if (pl.fill_color && pl.fill_color !== '' && pl.fill_color !== 'na') {
                    const { color: fillColor, opacity: fillOpacity } = ColorUtils.parseColor(pl.fill_color);
                    const fillPoints = pl.closed
                        ? pixelPoints
                        : pixelPoints;

                    if (pl.curved) {
                        // Curved fill: use the same smooth path but as a filled polygon
                        const pathData = this.buildCurvedPath(fillPoints, pl.closed);
                        children.push({
                            type: 'path',
                            shape: { pathData: pathData + ' Z' },
                            style: {
                                fill: fillColor,
                                opacity: fillOpacity,
                                stroke: 'none',
                            },
                            silent: true,
                        });
                    } else {
                        children.push({
                            type: 'polygon',
                            shape: { points: fillPoints },
                            style: {
                                fill: fillColor,
                                opacity: fillOpacity,
                                stroke: 'none',
                            },
                            silent: true,
                        });
                    }
                }

                // Stroke (line segments)
                if (pl.curved) {
                    const pathData = this.buildCurvedPath(pixelPoints, pl.closed);
                    children.push({
                        type: 'path',
                        shape: { pathData },
                        style: {
                            fill: 'none',
                            stroke: lineColor,
                            lineWidth,
                            lineDash: dashPattern,
                        },
                        silent: true,
                    });
                } else {
                    // Straight polyline
                    const allPoints = pl.closed
                        ? [...pixelPoints, pixelPoints[0]]
                        : pixelPoints;

                    children.push({
                        type: 'polyline',
                        shape: { points: allPoints },
                        style: {
                            fill: 'none',
                            stroke: lineColor,
                            lineWidth,
                            lineDash: dashPattern,
                        },
                        silent: true,
                    });
                }

                return { type: 'group', children };
            },
            data: polyData,
            z: 12,
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
