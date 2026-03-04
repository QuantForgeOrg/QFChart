import { ColorUtils } from '../utils/ColorUtils';

/**
 * Renders Pine Script table objects as HTML DOM overlays positioned
 * absolutely over the ECharts chart canvas.
 *
 * Tables use fixed positions (top_left, bottom_center, etc.) rather
 * than data coordinates, so they are rendered as HTML elements instead
 * of ECharts custom series.
 */
export class TableOverlayRenderer {

    /**
     * Parse a color value for table rendering.
     * Unlike ColorUtils.parseColor (which defaults to 0.3 opacity for fills),
     * tables treat hex/named colors as fully opaque — only rgba provides opacity.
     */
    private static safeParseColor(val: any): { color: string; opacity: number } {
        if (!val || typeof val !== 'string') {
            return { color: '#888888', opacity: 1 };
        }
        // Extract opacity from rgba(), otherwise assume fully opaque
        const rgbaMatch = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
            const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
            return { color: `rgb(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]})`, opacity: a };
        }
        return { color: val, opacity: 1 };
    }

    /**
     * Clear all existing table overlays and render new ones.
     * @param gridRect The ECharts grid rect {x, y, width, height} in pixels,
     *                 representing the actual plot area within the container.
     */
    static render(container: HTMLElement, tables: any[], gridRect?: { x: number; y: number; width: number; height: number }): void {
        TableOverlayRenderer.clearAll(container);

        // Pine Script: only the last table at each position is displayed
        const byPosition = new Map<string, any>();
        for (const tbl of tables) {
            if (tbl && !tbl._deleted) {
                byPosition.set(tbl.position, tbl);
            }
        }

        byPosition.forEach((tbl) => {
            const el = TableOverlayRenderer.buildTable(tbl);
            TableOverlayRenderer.positionTable(el, tbl.position, gridRect);
            container.appendChild(el);
        });
    }

    static clearAll(container: HTMLElement): void {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    private static buildTable(tbl: any): HTMLElement {
        const table = document.createElement('table');
        table.style.borderCollapse = 'separate';
        table.style.borderSpacing = '0';
        table.style.pointerEvents = 'auto';
        table.style.fontSize = '14px';
        table.style.lineHeight = '1.4';
        table.style.fontFamily = 'sans-serif';
        table.style.margin = '4px';

        // Table background
        if (tbl.bgcolor) {
            const { color, opacity } = TableOverlayRenderer.safeParseColor(tbl.bgcolor);
            table.style.backgroundColor = color;
            if (opacity < 1) table.style.opacity = String(opacity);
        }

        // Frame (outer border)
        if (tbl.frame_width > 0 && tbl.frame_color) {
            const { color: fc } = TableOverlayRenderer.safeParseColor(tbl.frame_color);
            table.style.border = `${tbl.frame_width}px solid ${fc}`;
        } else if (tbl.frame_width > 0) {
            table.style.border = `${tbl.frame_width}px solid #999`;
        }

        // Build merge lookup: for each cell, determine colspan/rowspan
        const mergeMap = new Map<string, { colspan: number; rowspan: number }>();
        const mergedCells = new Set<string>();

        if (tbl.merges) {
            for (const m of tbl.merges) {
                const key = `${m.startCol},${m.startRow}`;
                mergeMap.set(key, {
                    colspan: m.endCol - m.startCol + 1,
                    rowspan: m.endRow - m.startRow + 1,
                });
                // Mark all cells covered by this merge (except the origin)
                for (let r = m.startRow; r <= m.endRow; r++) {
                    for (let c = m.startCol; c <= m.endCol; c++) {
                        if (r === m.startRow && c === m.startCol) continue;
                        mergedCells.add(`${c},${r}`);
                    }
                }
            }
        }

        // Build rows
        const rows = tbl.rows || 0;
        const cols = tbl.columns || 0;

        for (let r = 0; r < rows; r++) {
            const tr = document.createElement('tr');

            for (let c = 0; c < cols; c++) {
                const cellKey = `${c},${r}`;

                // Skip cells that are covered by a merge
                if (mergedCells.has(cellKey)) continue;

                const td = document.createElement('td');

                // Apply merge attributes
                const merge = mergeMap.get(cellKey);
                if (merge) {
                    if (merge.colspan > 1) td.colSpan = merge.colspan;
                    if (merge.rowspan > 1) td.rowSpan = merge.rowspan;
                }

                // Cell borders
                if (tbl.border_width > 0) {
                    const bc = tbl.border_color
                        ? TableOverlayRenderer.safeParseColor(tbl.border_color).color
                        : '#999';
                    td.style.border = `${tbl.border_width}px solid ${bc}`;
                }

                // Get cell data
                const cellData = tbl.cells?.[r]?.[c];
                if (cellData && !cellData._merged) {
                    // Cell text
                    td.textContent = cellData.text || '';

                    // Cell background
                    if (cellData.bgcolor) {
                        const { color: bg, opacity: bgOp } = TableOverlayRenderer.safeParseColor(cellData.bgcolor);
                        td.style.backgroundColor = bg;
                        if (bgOp < 1) {
                            // Use rgba for cell-level opacity to avoid affecting text
                            td.style.backgroundColor = cellData.bgcolor;
                        }
                    }

                    // Text color
                    if (cellData.text_color) {
                        const { color: tc } = TableOverlayRenderer.safeParseColor(cellData.text_color);
                        td.style.color = tc;
                    }

                    // Text size
                    td.style.fontSize = TableOverlayRenderer.getSizePixels(cellData.text_size) + 'px';

                    // Text alignment
                    td.style.textAlign = TableOverlayRenderer.mapHAlign(cellData.text_halign);
                    td.style.verticalAlign = TableOverlayRenderer.mapVAlign(cellData.text_valign);

                    // Font family
                    if (cellData.text_font_family === 'monospace') {
                        td.style.fontFamily = 'monospace';
                    }

                    // Width/height (% of chart area, 0 = auto)
                    if (cellData.width > 0) {
                        td.style.width = cellData.width + '%';
                    }
                    if (cellData.height > 0) {
                        td.style.height = cellData.height + '%';
                    }

                    // Tooltip
                    if (cellData.tooltip) {
                        td.title = cellData.tooltip;
                    }
                }

                // Default padding
                td.style.padding = '4px 6px';
                td.style.whiteSpace = 'nowrap';

                tr.appendChild(td);
            }

            table.appendChild(tr);
        }

        return table;
    }

    private static positionTable(
        el: HTMLElement,
        position: string,
        gridRect?: { x: number; y: number; width: number; height: number },
    ): void {
        el.style.position = 'absolute';

        // Use grid rect (actual plot area) if available, otherwise fall back to container edges.
        // Inset bottom/right by a few pixels so tables don't touch the axis lines.
        const PAD = 8;
        const top = gridRect ? gridRect.y + 'px' : '0';
        const left = gridRect ? gridRect.x + 'px' : '0';
        const bottom = gridRect ? (gridRect.y + gridRect.height - PAD) + 'px' : '0';
        const right = gridRect ? (gridRect.x + gridRect.width - PAD) + 'px' : '0';
        const centerX = gridRect ? (gridRect.x + gridRect.width / 2) + 'px' : '50%';
        const centerY = gridRect ? (gridRect.y + gridRect.height / 2) + 'px' : '50%';

        switch (position) {
            case 'top_left':
                el.style.top = top;
                el.style.left = left;
                break;
            case 'top_center':
                el.style.top = top;
                el.style.left = centerX;
                el.style.transform = 'translateX(-50%)';
                break;
            case 'top_right':
                el.style.top = top;
                el.style.left = right;
                el.style.transform = 'translateX(-100%)';
                break;
            case 'middle_left':
                el.style.top = centerY;
                el.style.left = left;
                el.style.transform = 'translateY(-50%)';
                break;
            case 'middle_center':
                el.style.top = centerY;
                el.style.left = centerX;
                el.style.transform = 'translate(-50%, -50%)';
                break;
            case 'middle_right':
                el.style.top = centerY;
                el.style.left = right;
                el.style.transform = 'translate(-100%, -50%)';
                break;
            case 'bottom_left':
                el.style.top = bottom;
                el.style.left = left;
                el.style.transform = 'translateY(-100%)';
                break;
            case 'bottom_center':
                el.style.top = bottom;
                el.style.left = centerX;
                el.style.transform = 'translate(-50%, -100%)';
                break;
            case 'bottom_right':
                el.style.top = bottom;
                el.style.left = right;
                el.style.transform = 'translate(-100%, -100%)';
                break;
            default:
                el.style.top = top;
                el.style.left = right;
                el.style.transform = 'translateX(-100%)';
                break;
        }
    }

    private static getSizePixels(size: string | number): number {
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
                return 14;
        }
    }

    private static mapHAlign(align: string): string {
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

    private static mapVAlign(align: string): string {
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
}
