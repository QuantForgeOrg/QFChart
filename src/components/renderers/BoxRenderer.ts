import { SeriesRenderer, RenderContext } from './SeriesRenderer';

/**
 * Convert any color string to a format ECharts canvas can render with opacity.
 * 8-digit hex (#RRGGBBAA) is not universally supported by canvas — convert to rgba().
 */
function normalizeColor(color: string | undefined): string | undefined {
    if (!color || typeof color !== 'string') return color;
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 8) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            const a = parseInt(hex.slice(6, 8), 16) / 255;
            return `rgba(${r},${g},${b},${a.toFixed(3)})`;
        }
    }
    return color;
}

/**
 * Renderer for Pine Script box.* drawing objects.
 * Each box is defined by two corners (left,top) → (right,bottom)
 * with fill, border, optional text, and optional extend.
 *
 * Style name: 'drawing_box' (distinct from other styles).
 */
export class BoxRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, dataIndexOffset } = context;
        const offset = dataIndexOffset || 0;

        // Collect all non-deleted box objects from the sparse dataArray.
        const boxObjects: any[] = [];

        for (let i = 0; i < dataArray.length; i++) {
            const val = dataArray[i];
            if (!val) continue;

            const items = Array.isArray(val) ? val : [val];
            for (const bx of items) {
                if (bx && typeof bx === 'object' && !bx._deleted) {
                    boxObjects.push(bx);
                }
            }
        }

        if (boxObjects.length === 0) {
            return { name: seriesName, type: 'custom', xAxisIndex, yAxisIndex, data: [], silent: true };
        }

        // Compute y-range for axis scaling
        let yMin = Infinity, yMax = -Infinity;
        for (const bx of boxObjects) {
            if (bx.top < yMin) yMin = bx.top;
            if (bx.top > yMax) yMax = bx.top;
            if (bx.bottom < yMin) yMin = bx.bottom;
            if (bx.bottom > yMax) yMax = bx.bottom;
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

                for (const bx of boxObjects) {
                    if (bx._deleted) continue;

                    const xOff = (bx.xloc === 'bar_index' || bx.xloc === 'bi') ? offset : 0;
                    const pTopLeft = api.coord([bx.left + xOff, bx.top]);
                    const pBottomRight = api.coord([bx.right + xOff, bx.bottom]);

                    let x = pTopLeft[0];
                    let y = pTopLeft[1];
                    let w = pBottomRight[0] - pTopLeft[0];
                    let h = pBottomRight[1] - pTopLeft[1];

                    // Handle extend (none/n | left/l | right/r | both/b)
                    const extend = bx.extend || 'none';
                    if (extend !== 'none' && extend !== 'n') {
                        const cs = params.coordSys;
                        if (extend === 'left' || extend === 'l' || extend === 'both' || extend === 'b') {
                            x = cs.x;
                            w = (extend === 'both' || extend === 'b') ? cs.width : (pBottomRight[0] - cs.x);
                        }
                        if (extend === 'right' || extend === 'r' || extend === 'both' || extend === 'b') {
                            if (extend === 'right' || extend === 'r') {
                                w = cs.x + cs.width - pTopLeft[0];
                            }
                        }
                    }

                    // Background fill rect
                    const bgColor = normalizeColor(bx.bgcolor) || '#2962ff';
                    children.push({
                        type: 'rect',
                        shape: { x, y, width: w, height: h },
                        style: { fill: bgColor },
                    });

                    // Border rect (on top of fill)
                    // border_color = na means no border (na resolves to NaN or undefined)
                    const rawBorderColor = bx.border_color;
                    const isNaBorder = rawBorderColor === null || rawBorderColor === undefined ||
                        (typeof rawBorderColor === 'number' && isNaN(rawBorderColor)) ||
                        rawBorderColor === 'na' || rawBorderColor === 'NaN';
                    const borderColor = isNaBorder ? null : (normalizeColor(rawBorderColor) || '#2962ff');
                    const borderWidth = bx.border_width ?? 1;
                    if (borderWidth > 0 && borderColor) {
                        children.push({
                            type: 'rect',
                            shape: { x, y, width: w, height: h },
                            style: {
                                fill: 'none',
                                stroke: borderColor,
                                lineWidth: borderWidth,
                                lineDash: this.getDashPattern(bx.border_style),
                            },
                        });
                    }

                    // Text inside box
                    if (bx.text) {
                        const textX = this.getTextX(x, w, bx.text_halign);
                        const textY = this.getTextY(y, h, bx.text_valign);
                        children.push({
                            type: 'text',
                            style: {
                                x: textX,
                                y: textY,
                                text: bx.text,
                                fill: normalizeColor(bx.text_color) || '#000000',
                                fontSize: this.getSizePixels(bx.text_size),
                                fontFamily: bx.text_font_family === 'monospace' ? 'monospace' : 'sans-serif',
                                fontWeight: (bx.text_formatting === 'format_bold') ? 'bold' : 'normal',
                                fontStyle: (bx.text_formatting === 'format_italic') ? 'italic' : 'normal',
                                textAlign: this.mapHAlign(bx.text_halign),
                                textVerticalAlign: this.mapVAlign(bx.text_valign),
                            },
                        });
                    }
                }

                return { type: 'group', children };
            },
            data: [[0, lastBarIndex, yMin, yMax]],
            clip: true,
            encode: { x: [0, 1], y: [2, 3] },
            // Prevent ECharts visual system from overriding element colors with palette
            itemStyle: { color: 'transparent', borderColor: 'transparent' },
            z: 14,
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

    private getSizePixels(size: string | number): number {
        if (typeof size === 'number' && size > 0) return size;
        switch (size) {
            case 'auto':
            case 'size.auto':
                return 12;
            case 'tiny':
            case 'size.tiny':
                return 8;
            case 'small':
            case 'size.small':
                return 10;
            case 'normal':
            case 'size.normal':
                return 14;
            case 'large':
            case 'size.large':
                return 20;
            case 'huge':
            case 'size.huge':
                return 36;
            default:
                return 12;
        }
    }

    private mapHAlign(align: string): string {
        switch (align) {
            case 'left':
            case 'text.align_left':
                return 'left';
            case 'right':
            case 'text.align_right':
                return 'right';
            case 'center':
            case 'text.align_center':
            default:
                return 'center';
        }
    }

    private mapVAlign(align: string): string {
        switch (align) {
            case 'top':
            case 'text.align_top':
                return 'top';
            case 'bottom':
            case 'text.align_bottom':
                return 'bottom';
            case 'center':
            case 'text.align_center':
            default:
                return 'middle';
        }
    }

    private getTextX(x: number, w: number, halign: string): number {
        switch (halign) {
            case 'left':
            case 'text.align_left':
                return x + 4;
            case 'right':
            case 'text.align_right':
                return x + w - 4;
            case 'center':
            case 'text.align_center':
            default:
                return x + w / 2;
        }
    }

    private getTextY(y: number, h: number, valign: string): number {
        switch (valign) {
            case 'top':
            case 'text.align_top':
                return y + 4;
            case 'bottom':
            case 'text.align_bottom':
                return y + h - 4;
            case 'center':
            case 'text.align_center':
            default:
                return y + h / 2;
        }
    }
}
