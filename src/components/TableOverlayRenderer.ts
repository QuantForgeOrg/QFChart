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
     * @param getGridRect Function that returns the ECharts grid rect for a given pane index.
     */
    static render(
        container: HTMLElement,
        tables: any[],
        getGridRect?: (paneIndex: number) => { x: number; y: number; width: number; height: number } | undefined,
    ): void {
        TableOverlayRenderer.clearAll(container);

        // Pine Script: only the last table at each position is displayed
        const byPosition = new Map<string, any>();
        for (const tbl of tables) {
            if (tbl && !tbl._deleted) {
                byPosition.set(tbl.position, tbl);
            }
        }

        byPosition.forEach((tbl) => {
            const paneIndex = tbl._paneIndex ?? 0;
            const gridRect = getGridRect ? getGridRect(paneIndex) : undefined;
            const el = TableOverlayRenderer.buildTable(tbl, gridRect);
            TableOverlayRenderer.positionTable(el, tbl.position, gridRect);
            container.appendChild(el);
        });
    }

    static clearAll(container: HTMLElement): void {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    private static buildTable(
        tbl: any,
        gridRect?: { x: number; y: number; width: number; height: number },
    ): HTMLElement {
        const table = document.createElement('table');
        const borderWidth = tbl.border_width ?? 0;
        const frameWidth = tbl.frame_width ?? 0;
        // Use collapse when no visible borders — prevents sub-pixel hairlines between cells.
        // Use separate when visible borders are present — so each cell's border is drawn independently.
        const hasVisibleBorders = (borderWidth > 0 && !!tbl.border_color) || (frameWidth > 0 && !!tbl.frame_color);
        if (hasVisibleBorders) {
            table.style.borderCollapse = 'separate';
            table.style.borderSpacing = '0';
        } else {
            table.style.borderCollapse = 'collapse';
        }
        table.style.pointerEvents = 'none';
        table.style.fontSize = '14px';
        table.style.lineHeight = '1.4';
        table.style.fontFamily = 'sans-serif';
        table.style.margin = '4px';

        // Constrain table to chart area so it doesn't overflow
        if (gridRect) {
            table.style.maxHeight = gridRect.height + 'px';
            table.style.maxWidth = gridRect.width + 'px';
            table.style.overflow = 'hidden';
        }

        // Table background
        if (tbl.bgcolor) {
            const { color, opacity } = TableOverlayRenderer.safeParseColor(tbl.bgcolor);
            table.style.backgroundColor = color;
            if (opacity < 1) table.style.opacity = String(opacity);
        }

        // Frame (outer border)
        // Pine Script default frame_color is "no color" (transparent), so only
        // draw frame when an explicit color is provided.
        if (frameWidth > 0 && tbl.frame_color) {
            const { color: fc } = TableOverlayRenderer.safeParseColor(tbl.frame_color);
            table.style.border = `${frameWidth}px solid ${fc}`;
        } else {
            table.style.border = 'none';
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

        // Cell border settings
        // Pine Script default border_color is "no color" (transparent), so only
        // draw cell borders when an explicit color is provided.
        const hasCellBorders = borderWidth > 0 && !!tbl.border_color;
        const borderColorStr = hasCellBorders
            ? TableOverlayRenderer.safeParseColor(tbl.border_color).color
            : '';

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
                if (hasCellBorders) {
                    td.style.border = `${borderWidth}px solid ${borderColorStr}`;
                } else {
                    td.style.border = 'none';
                }

                // Get cell data
                const cellData = tbl.cells?.[r]?.[c];
                if (cellData && !cellData._merged) {
                    // Cell text
                    td.textContent = cellData.text || '';

                    // Cell background — only apply if an explicit color string is set.
                    // Empty string or na (NaN) means "no color" → transparent,
                    // so the table's own bgcolor shows through.
                    if (cellData.bgcolor && typeof cellData.bgcolor === 'string' && cellData.bgcolor.length > 0) {
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

                    // Width/height: Pine Script defines these as % of chart visual space (0-100).
                    // Convert to pixels using gridRect so the table scales with chart size.
                    if (cellData.width > 0) {
                        if (gridRect) {
                            const px = Math.max(1, cellData.width * gridRect.width / 100);
                            td.style.width = px + 'px';
                        } else {
                            td.style.width = cellData.width + '%';
                        }
                    }
                    if (cellData.height > 0) {
                        if (gridRect) {
                            const px = Math.max(1, cellData.height * gridRect.height / 100);
                            td.style.height = px + 'px';
                        } else {
                            td.style.height = cellData.height + '%';
                        }
                    }

                    // Tooltip
                    if (cellData.tooltip) {
                        td.title = cellData.tooltip;
                    }
                }

                // Padding: use minimal padding for cells with tiny explicit heights
                // (e.g., bar-chart rows with height=0.1 in PTAG indicators)
                const cellHeight = cellData?.height ?? 0;
                if (cellHeight > 0 && gridRect && cellHeight * gridRect.height / 100 < 4) {
                    td.style.padding = '0';
                } else {
                    td.style.padding = '4px 6px';
                }
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
