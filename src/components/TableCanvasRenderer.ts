/**
 * Renders Pine Script table objects as ECharts graphic elements on the canvas.
 *
 * Instead of DOM overlays (TableOverlayRenderer), this renderer produces
 * flat ECharts graphic elements — rects + texts — that are drawn directly
 * on the canvas alongside charts. This provides:
 *
 * - Pixel-perfect sizing (Pine Script % maps directly to px via gridRect)
 * - Single render pipeline (participates in ECharts export, animation, resize)
 * - Better performance for large tables (5000+ cells as canvas rects vs DOM nodes)
 * - Correct z-ordering with other chart elements
 *
 * Note: ECharts' graphic merge (`notMerge: false`) does not preserve nested
 * group→children hierarchies. All elements are therefore emitted as flat,
 * absolute-positioned top-level elements.
 *
 * All coordinates are Math.round()'d to avoid sub-pixel gaps between adjacent cells.
 */
export class TableCanvasRenderer {

    // ── Color Parsing ──────────────────────────────────────────

    private static parseColor(val: any): { color: string; opacity: number } {
        if (!val || typeof val !== 'string' || val.length === 0) {
            return { color: '', opacity: 0 };
        }
        const rgbaMatch = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
            const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
            return { color: `rgb(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]})`, opacity: a };
        }
        if (/^#[0-9a-fA-F]{8}$/.test(val)) {
            const r = parseInt(val.slice(1, 3), 16);
            const g = parseInt(val.slice(3, 5), 16);
            const b = parseInt(val.slice(5, 7), 16);
            const a = parseInt(val.slice(7, 9), 16) / 255;
            return { color: `rgb(${r},${g},${b})`, opacity: a };
        }
        return { color: val, opacity: 1 };
    }

    // ── Size / Alignment Mapping ───────────────────────────────
    // TradingView reference sizes (approximate px at 1× DPR)

    private static getSizePixels(size: string | number): number {
        if (typeof size === 'number' && size > 0) return size;
        switch (size) {
            case 'auto':  case 'size.auto':   return 11;
            case 'tiny':  case 'size.tiny':   return 8;
            case 'small': case 'size.small':  return 10;
            case 'normal':case 'size.normal': return 12;
            case 'large': case 'size.large':  return 16;
            case 'huge':  case 'size.huge':   return 24;
            default: return 12;
        }
    }

    private static mapHAlign(align: string): 'left' | 'center' | 'right' {
        switch (align) {
            case 'left':  case 'text.align_left':   return 'left';
            case 'right': case 'text.align_right':  return 'right';
            default: return 'center';
        }
    }

    private static mapVAlign(align: string): 'top' | 'middle' | 'bottom' {
        switch (align) {
            case 'top':    case 'text.align_top':    return 'top';
            case 'bottom': case 'text.align_bottom': return 'bottom';
            default: return 'middle';
        }
    }

    // ── Main Entry Point ──────────────────────────────────────

    /**
     * Build flat ECharts graphic elements for all tables.
     * Returns an array of rect/text elements with absolute positions.
     */
    static buildGraphicElements(
        tables: any[],
        getGridRect: (paneIndex: number) => { x: number; y: number; width: number; height: number } | undefined,
    ): any[] {
        if (!tables || tables.length === 0) return [];

        // Pine Script: only the last table at each position is displayed
        const byPosition = new Map<string, any>();
        for (const tbl of tables) {
            if (tbl && !tbl._deleted) {
                byPosition.set(tbl.position, tbl);
            }
        }

        const elements: any[] = [];
        byPosition.forEach((tbl) => {
            const paneIndex = tbl._paneIndex ?? 0;
            const gridRect = getGridRect(paneIndex);
            if (!gridRect) return;

            const tableElements = TableCanvasRenderer.buildTableElements(tbl, gridRect);
            elements.push(...tableElements);
        });

        return elements;
    }

    // ── Table Layout Engine ──────────────────────────────────

    /**
     * Measure and layout a table, producing flat absolute-positioned elements.
     * Returns an array of ECharts graphic rect/text elements.
     */
    private static buildTableElements(
        tbl: any,
        gridRect: { x: number; y: number; width: number; height: number },
    ): any[] {
        const rows = tbl.rows || 0;
        const cols = tbl.columns || 0;
        if (rows === 0 || cols === 0) return [];

        const borderWidth = tbl.border_width ?? 0;
        const frameWidth = tbl.frame_width ?? 0;
        const hasCellBorders = borderWidth > 0 && !!tbl.border_color;
        const hasFrame = frameWidth > 0 && !!tbl.frame_color;

        // ── Build merge lookup ──
        const mergeMap = new Map<string, { colspan: number; rowspan: number }>();
        const mergedCells = new Set<string>();
        if (tbl.merges) {
            for (const m of tbl.merges) {
                mergeMap.set(`${m.startCol},${m.startRow}`, {
                    colspan: m.endCol - m.startCol + 1,
                    rowspan: m.endRow - m.startRow + 1,
                });
                for (let r = m.startRow; r <= m.endRow; r++) {
                    for (let c = m.startCol; c <= m.endCol; c++) {
                        if (r === m.startRow && c === m.startCol) continue;
                        mergedCells.add(`${c},${r}`);
                    }
                }
            }
        }

        const PAD_X = 4;
        const PAD_Y = 2;
        const LINE_HEIGHT = 1.25; // Multiplier for line height (tighter than 1.4)

        // ── Phase 1: Measure each cell ──
        type CellInfo = {
            text: string; lines: string[]; fontSize: number; fontFamily: string;
            textColor: { color: string; opacity: number };
            bgColor: { color: string; opacity: number };
            halign: 'left' | 'center' | 'right';
            valign: 'top' | 'middle' | 'bottom';
            explicitWidth: number; explicitHeight: number;
            colspan: number; rowspan: number; skip: boolean;
            padX: number; padY: number;
        };
        const cellInfos: CellInfo[][] = [];

        for (let r = 0; r < rows; r++) {
            cellInfos[r] = [];
            for (let c = 0; c < cols; c++) {
                if (mergedCells.has(`${c},${r}`)) {
                    cellInfos[r][c] = {
                        text: '', lines: [], fontSize: 12, fontFamily: 'sans-serif',
                        textColor: { color: '', opacity: 0 }, bgColor: { color: '', opacity: 0 },
                        halign: 'center', valign: 'middle',
                        explicitWidth: 0, explicitHeight: 0,
                        colspan: 1, rowspan: 1, skip: true, padX: 0, padY: 0,
                    };
                    continue;
                }

                const cellData = tbl.cells?.[r]?.[c];
                const merge = mergeMap.get(`${c},${r}`);
                const colspan = merge?.colspan ?? 1;
                const rowspan = merge?.rowspan ?? 1;

                const text = (cellData && !cellData._merged) ? (cellData.text || '') : '';
                const lines = text ? text.split('\n') : [];
                const fontSize = cellData ? TableCanvasRenderer.getSizePixels(cellData.text_size) : 12;
                const fontFamily = cellData?.text_font_family === 'monospace' ? 'monospace' : 'sans-serif';

                let explicitWidth = 0;
                let explicitHeight = 0;
                if (cellData?.width > 0) explicitWidth = Math.max(1, cellData.width * gridRect.width / 100);
                if (cellData?.height > 0) explicitHeight = Math.max(1, cellData.height * gridRect.height / 100);

                const isTiny = explicitHeight > 0 && explicitHeight < 4;
                const padX = isTiny ? 0 : PAD_X;
                const padY = isTiny ? 0 : PAD_Y;

                const bgRaw = (cellData && !cellData._merged && cellData.bgcolor &&
                    typeof cellData.bgcolor === 'string' && cellData.bgcolor.length > 0)
                    ? cellData.bgcolor : '';
                const textColorRaw = cellData?.text_color || '';

                cellInfos[r][c] = {
                    text, lines, fontSize, fontFamily,
                    textColor: textColorRaw ? TableCanvasRenderer.parseColor(textColorRaw) : { color: '#e0e0e0', opacity: 1 },
                    bgColor: bgRaw ? TableCanvasRenderer.parseColor(bgRaw) : { color: '', opacity: 0 },
                    halign: cellData ? TableCanvasRenderer.mapHAlign(cellData.text_halign) : 'center',
                    valign: cellData ? TableCanvasRenderer.mapVAlign(cellData.text_valign) : 'middle',
                    explicitWidth, explicitHeight, colspan, rowspan,
                    skip: false, padX, padY,
                };
            }
        }

        // ── Phase 2: Compute column widths and row heights ──
        const colWidths = new Array(cols).fill(0);
        const rowHeights = new Array(rows).fill(0);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const info = cellInfos[r][c];
                if (info.skip || info.colspan > 1 || info.rowspan > 1) continue;

                const textW = TableCanvasRenderer.measureMultiLineWidth(info.lines, info.fontSize, info.fontFamily);
                const numLines = Math.max(info.lines.length, 1);

                const cellW = info.explicitWidth > 0
                    ? info.explicitWidth
                    : textW + info.padX * 2;
                const cellH = info.explicitHeight > 0
                    ? info.explicitHeight
                    : numLines * info.fontSize * LINE_HEIGHT + info.padY * 2;
                colWidths[c] = Math.max(colWidths[c], cellW);
                rowHeights[r] = Math.max(rowHeights[r], cellH);
            }
        }

        for (let c = 0; c < cols; c++) { if (colWidths[c] === 0) colWidths[c] = 20; }
        for (let r = 0; r < rows; r++) { if (rowHeights[r] === 0) rowHeights[r] = 4; }

        // Distribute merged cell sizes.
        // Cells with colspan > 1 or rowspan > 1 are skipped in the initial sizing pass.
        // This second pass ensures their text content fits.
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const info = cellInfos[r][c];
                if (info.skip) continue;

                const numLines = Math.max(info.lines.length, 1);
                const neededH = info.explicitHeight > 0
                    ? info.explicitHeight
                    : numLines * info.fontSize * LINE_HEIGHT + info.padY * 2;

                if (info.colspan > 1) {
                    // Expand columns to fit this merged cell's text width
                    const spanned = TableCanvasRenderer.sumRange(colWidths, c, info.colspan);
                    const textW = TableCanvasRenderer.measureMultiLineWidth(info.lines, info.fontSize, info.fontFamily);
                    const neededW = info.explicitWidth > 0
                        ? info.explicitWidth
                        : textW + info.padX * 2;
                    if (neededW > spanned) {
                        const perCol = (neededW - spanned) / info.colspan;
                        for (let i = 0; i < info.colspan; i++) colWidths[c + i] += perCol;
                    }

                    // For colspan-only merges (rowspan=1), also ensure the single row
                    // is tall enough for the merged cell's multi-line text.
                    if (info.rowspan === 1) {
                        rowHeights[r] = Math.max(rowHeights[r], neededH);
                    }
                }

                if (info.rowspan > 1) {
                    // Expand rows to fit this merged cell's text height
                    const spanned = TableCanvasRenderer.sumRange(rowHeights, r, info.rowspan);
                    if (neededH > spanned) {
                        const perRow = (neededH - spanned) / info.rowspan;
                        for (let i = 0; i < info.rowspan; i++) rowHeights[r + i] += perRow;
                    }
                }
            }
        }

        // Round column widths and row heights to integers to prevent sub-pixel gaps
        for (let c = 0; c < cols; c++) colWidths[c] = Math.round(colWidths[c]);
        for (let r = 0; r < rows; r++) rowHeights[r] = Math.round(rowHeights[r]);

        // Build cumulative position arrays (no extra spacing for borders —
        // cell border strokes overlap at shared edges, matching TradingView)
        const colX = new Array(cols + 1).fill(0);
        for (let c = 0; c < cols; c++) colX[c + 1] = colX[c] + colWidths[c];
        const rowY = new Array(rows + 1).fill(0);
        for (let r = 0; r < rows; r++) rowY[r + 1] = rowY[r] + rowHeights[r];

        const frameOffset = hasFrame ? frameWidth : 0;
        const totalWidth = colX[cols] + frameOffset * 2;
        const totalHeight = rowY[rows] + frameOffset * 2;

        const clampedWidth = Math.min(totalWidth, gridRect.width);
        const clampedHeight = Math.min(totalHeight, gridRect.height);

        // ── Phase 3: Position the table within the grid (absolute px, rounded) ──
        const pos = TableCanvasRenderer.computePosition(
            tbl.position, gridRect, clampedWidth, clampedHeight,
        );
        const tableX = Math.round(pos.x);
        const tableY = Math.round(pos.y);

        // ── Phase 4: Build flat graphic elements with absolute positions ──
        const elements: any[] = [];
        const ox = tableX + frameOffset;
        const oy = tableY + frameOffset;

        // Table background — single rect covering entire table area
        if (tbl.bgcolor) {
            const { color, opacity } = TableCanvasRenderer.parseColor(tbl.bgcolor);
            if (opacity > 0) {
                elements.push({
                    type: 'rect',
                    shape: { x: tableX, y: tableY, width: clampedWidth, height: clampedHeight },
                    style: { fill: color, opacity },
                    silent: true,
                    z: 0,
                    z2: 0,
                });
            }
        }

        // Frame border (drawn as inset stroke)
        if (hasFrame) {
            const { color: fc } = TableCanvasRenderer.parseColor(tbl.frame_color);
            const half = frameWidth / 2;
            elements.push({
                type: 'rect',
                shape: {
                    x: tableX + half,
                    y: tableY + half,
                    width: clampedWidth - frameWidth,
                    height: clampedHeight - frameWidth,
                },
                style: { fill: 'none', stroke: fc, lineWidth: frameWidth },
                silent: true,
                z: 0,
                z2: 1,
            });
        }

        // Cell backgrounds and borders
        const bdrColor = hasCellBorders ? TableCanvasRenderer.parseColor(tbl.border_color).color : '';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const info = cellInfos[r][c];
                if (info.skip) continue;

                const cx = ox + colX[c];
                const cy = oy + rowY[r];
                const cw = TableCanvasRenderer.sumRange(colWidths, c, info.colspan);
                const ch = TableCanvasRenderer.sumRange(rowHeights, r, info.rowspan);

                // Clip to table bounds
                if (cx - tableX >= clampedWidth || cy - tableY >= clampedHeight) continue;
                const drawW = Math.min(cw, clampedWidth - (cx - tableX));
                const drawH = Math.min(ch, clampedHeight - (cy - tableY));

                // Cell background
                if (info.bgColor.opacity > 0) {
                    elements.push({
                        type: 'rect',
                        shape: { x: cx, y: cy, width: drawW, height: drawH },
                        style: { fill: info.bgColor.color, opacity: info.bgColor.opacity },
                        silent: true, z: 0, z2: 2,
                    });
                }

                // Cell border — stroke centered on cell edge (overlaps with neighbors)
                if (hasCellBorders) {
                    elements.push({
                        type: 'rect',
                        shape: { x: cx, y: cy, width: drawW, height: drawH },
                        style: { fill: 'none', stroke: bdrColor, lineWidth: borderWidth },
                        silent: true, z: 0, z2: 3,
                    });
                }

                // Cell text
                if (info.text) {
                    let textX: number, textAlign: 'left' | 'center' | 'right';
                    switch (info.halign) {
                        case 'left':   textX = cx + info.padX;          textAlign = 'left';   break;
                        case 'right':  textX = cx + drawW - info.padX;  textAlign = 'right';  break;
                        default:       textX = cx + drawW / 2;          textAlign = 'center'; break;
                    }
                    let textY: number, textVAlign: 'top' | 'middle' | 'bottom';
                    switch (info.valign) {
                        case 'top':    textY = cy + info.padY;          textVAlign = 'top';    break;
                        case 'bottom': textY = cy + drawH - info.padY;  textVAlign = 'bottom'; break;
                        default:       textY = cy + drawH / 2;          textVAlign = 'middle'; break;
                    }

                    elements.push({
                        type: 'text',
                        x: textX,
                        y: textY,
                        style: {
                            text: info.text,
                            fill: info.textColor.color,
                            opacity: info.textColor.opacity,
                            font: `${info.fontSize}px ${info.fontFamily}`,
                            textAlign,
                            textVerticalAlign: textVAlign,
                            lineHeight: Math.round(info.fontSize * LINE_HEIGHT),
                        },
                        silent: true, z: 0, z2: 4,
                    });
                }
            }
        }

        return elements;
    }

    // ── Position Computation ─────────────────────────────────

    private static computePosition(
        position: string,
        gridRect: { x: number; y: number; width: number; height: number },
        tableWidth: number,
        tableHeight: number,
    ): { x: number; y: number } {
        const PAD = 4;
        const gx = gridRect.x;
        const gy = gridRect.y;
        const gw = gridRect.width;
        const gh = gridRect.height;

        switch (position) {
            case 'top_left':      return { x: gx + PAD, y: gy + PAD };
            case 'top_center':    return { x: gx + (gw - tableWidth) / 2, y: gy + PAD };
            case 'top_right':     return { x: gx + gw - tableWidth - PAD, y: gy + PAD };
            case 'middle_left':   return { x: gx + PAD, y: gy + (gh - tableHeight) / 2 };
            case 'middle_center': return { x: gx + (gw - tableWidth) / 2, y: gy + (gh - tableHeight) / 2 };
            case 'middle_right':  return { x: gx + gw - tableWidth - PAD, y: gy + (gh - tableHeight) / 2 };
            case 'bottom_left':   return { x: gx + PAD, y: gy + gh - tableHeight - PAD };
            case 'bottom_center': return { x: gx + (gw - tableWidth) / 2, y: gy + gh - tableHeight - PAD };
            case 'bottom_right':  return { x: gx + gw - tableWidth - PAD, y: gy + gh - tableHeight - PAD };
            default:              return { x: gx + gw - tableWidth - PAD, y: gy + PAD };
        }
    }

    // ── Utilities ────────────────────────────────────────────

    /**
     * Measure the max width across all lines of a multi-line text string.
     */
    private static measureMultiLineWidth(lines: string[], fontSize: number, fontFamily: string): number {
        if (!lines || lines.length === 0) return 0;
        const ratio = fontFamily === 'monospace' ? 0.6 : 0.55;
        let maxW = 0;
        for (const line of lines) {
            maxW = Math.max(maxW, line.length * fontSize * ratio);
        }
        return maxW;
    }

    private static sumRange(arr: number[], start: number, count: number): number {
        let sum = 0;
        for (let i = start; i < start + count && i < arr.length; i++) sum += arr[i];
        return sum;
    }
}
