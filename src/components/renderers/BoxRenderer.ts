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
 * Parse a CSS color string into { r, g, b } (0-255 each).
 * Supports #rgb, #rrggbb, #rrggbbaa, rgb(), rgba().
 */
function parseRGB(color: string | null | undefined): { r: number; g: number; b: number } | null {
    if (!color || typeof color !== 'string') return null;
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b };
        }
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b };
        }
        return null;
    }
    const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    return null;
}

/** Relative luminance (0 = black, 1 = white). */
function luminance(r: number, g: number, b: number): number {
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
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

        // Use a SINGLE data entry spanning the full x-range so renderItem is always called.
        // ECharts filters a data item only when ALL its x-dimensions are on the same side
        // of the visible window.  With dims 0=0 and 1=lastBar the item always straddles
        // the viewport, so renderItem fires exactly once regardless of scroll position.
        // Note: We do NOT encode y-dimensions — drawing objects should not influence the
        // y-axis auto-scaling.  Otherwise boxes drawn at the chart's end would prevent
        // the y-axis from adapting when scrolling to earlier (lower-priced) history.
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
                    // bgcolor = na means no fill (na resolves to NaN or undefined)
                    const rawBgColor = bx.bgcolor;
                    const isNaBgColor = rawBgColor === null || rawBgColor === undefined ||
                        (typeof rawBgColor === 'number' && isNaN(rawBgColor)) ||
                        rawBgColor === 'na' || rawBgColor === 'NaN' || rawBgColor === '';
                    const bgColor = isNaBgColor ? null : (normalizeColor(rawBgColor) || '#2962ff');
                    if (bgColor) {
                        children.push({
                            type: 'rect',
                            shape: { x, y, width: w, height: h },
                            style: { fill: bgColor, stroke: 'none' },
                        });
                    }

                    // Explicit border rect (on top of fill)
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

                        // Auto-contrast: TradingView renders box text as bold white on dark
                        // backgrounds. When text_color is the default black, compute luminance
                        // of bgcolor and use white text if the background is dark.
                        let textFill = normalizeColor(bx.text_color) || '#000000';
                        const isDefaultTextColor = !bx.text_color || bx.text_color === '#000000' ||
                            bx.text_color === 'black' || bx.text_color === 'color.black';
                        if (isDefaultTextColor && bgColor) {
                            const rgb = parseRGB(bgColor);
                            if (rgb && luminance(rgb.r, rgb.g, rgb.b) < 0.5) {
                                textFill = '#FFFFFF';
                            }
                        }

                        // TradingView renders box text bold by default (format_none → bold)
                        const isBold = !bx.text_formatting || bx.text_formatting === 'format_none' ||
                            bx.text_formatting === 'format_bold';

                        // Font size: for 'auto'/'size.auto', scale to fit within the box.
                        // For named sizes (tiny, small, etc.), use fixed values.
                        const fontSize = this.computeFontSize(bx.text_size, bx.text, Math.abs(w), Math.abs(h), isBold);

                        children.push({
                            type: 'text',
                            style: {
                                x: textX,
                                y: textY,
                                text: bx.text,
                                fill: textFill,
                                fontSize,
                                fontFamily: bx.text_font_family === 'monospace' ? 'monospace' : 'sans-serif',
                                fontWeight: isBold ? 'bold' : 'normal',
                                fontStyle: (bx.text_formatting === 'format_italic') ? 'italic' : 'normal',
                                textAlign: this.mapHAlign(bx.text_halign),
                                textVerticalAlign: this.mapVAlign(bx.text_valign),
                            },
                        });
                    }
                }

                return { type: 'group', children };
            },
            data: [[0, lastBarIndex]],
            clip: true,
            encode: { x: [0, 1] },
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

    /**
     * Compute font size for box text.
     * For 'auto'/'size.auto' (the default), dynamically scale text to fit within
     * the box dimensions with a small gap — matching TradingView behavior.
     * For explicit named sizes, return fixed pixel values.
     */
    private computeFontSize(size: string | number, text: string, boxW: number, boxH: number, bold: boolean): number {
        if (typeof size === 'number' && size > 0) return size;

        // Fixed named sizes
        switch (size) {
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
        }

        // 'auto' / 'size.auto' / default → scale to fit box
        if (!text || boxW <= 0 || boxH <= 0) return 12;

        const padding = 6; // px gap on each side
        const availW = boxW - padding * 2;
        const availH = boxH - padding * 2;
        if (availW <= 0 || availH <= 0) return 6;

        const lines = text.split('\n');
        const numLines = lines.length;

        // Find the longest line by character count
        let maxChars = 1;
        for (const line of lines) {
            if (line.length > maxChars) maxChars = line.length;
        }

        // Average character width ratio (font-size relative).
        // Bold sans-serif is ~0.62; regular is ~0.55.
        const charWidthRatio = bold ? 0.62 : 0.55;

        // Max font size constrained by width: availW = maxChars * fontSize * ratio
        const maxByWidth = availW / (maxChars * charWidthRatio);

        // Max font size constrained by height: availH = numLines * fontSize * lineHeight
        const lineHeight = 1.3;
        const maxByHeight = availH / (numLines * lineHeight);

        // Use the smaller of the two, clamped to a reasonable range
        const computed = Math.min(maxByWidth, maxByHeight);
        return Math.max(6, Math.min(computed, 48));
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
