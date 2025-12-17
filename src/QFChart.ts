import * as echarts from 'echarts';
import { OHLCV, IndicatorPlot, QFChartOptions, Indicator as IndicatorInterface, ChartContext, Plugin } from './types';
import { Indicator } from './components/Indicator';
import { LayoutManager } from './components/LayoutManager';
import { SeriesBuilder } from './components/SeriesBuilder';
import { GraphicBuilder } from './components/GraphicBuilder';
import { TooltipFormatter } from './components/TooltipFormatter';
import { PluginManager } from './components/PluginManager';
import { DrawingEditor } from './components/DrawingEditor';
import { EventBus } from './utils/EventBus';

export class QFChart implements ChartContext {
    private chart: echarts.ECharts;
    private options: QFChartOptions;
    private marketData: OHLCV[] = [];
    private indicators: Map<string, Indicator> = new Map();
    private timeToIndex: Map<number, number> = new Map();
    private pluginManager: PluginManager;
    private drawingEditor: DrawingEditor;
    public events: EventBus = new EventBus();
    private isMainCollapsed: boolean = false;
    private maximizedPaneId: string | null = null;

    private selectedDrawingId: string | null = null; // Track selected drawing

    // Drawing System
    private drawings: import('./types').DrawingElement[] = [];

    public coordinateConversion = {
        pixelToData: (point: { x: number; y: number }) => {
            // Find which grid/pane the point is in
            // We iterate through all panes (series indices usually match pane indices for base series)
            // Actually, we need to know how many panes there are.
            // We can use the layout logic or just check grid indices.
            // ECharts instance has getOption().
            const option = this.chart.getOption() as any;
            if (!option || !option.grid) return null;

            const gridCount = option.grid.length;
            for (let i = 0; i < gridCount; i++) {
                if (this.chart.containPixel({ gridIndex: i }, [point.x, point.y])) {
                    // Found the pane
                    const p = this.chart.convertFromPixel({ seriesIndex: i }, [point.x, point.y]);
                    // Note: convertFromPixel might need seriesIndex or gridIndex depending on setup.
                    // Using gridIndex in convertFromPixel is supported in newer ECharts but sometimes tricky.
                    // Since we have one base series per pane (candlestick at 0, indicators at 1+),
                    // assuming seriesIndex = gridIndex usually works if they are mapped 1:1.
                    // Wait, candlestick is series 0. Indicators are subsequent series.
                    // Series index != grid index necessarily.
                    // BUT we can use { gridIndex: i } for convertFromPixel too!
                    const pGrid = this.chart.convertFromPixel({ gridIndex: i }, [point.x, point.y]);

                    if (pGrid) {
                        // Store padded coordinates directly (don't subtract offset)
                        // This ensures all coordinates are positive and within the valid padded range
                        return { timeIndex: Math.round(pGrid[0]), value: pGrid[1], paneIndex: i };
                    }
                }
            }
            return null;
        },
        dataToPixel: (point: { timeIndex: number; value: number; paneIndex?: number }) => {
            const paneIdx = point.paneIndex || 0;
            // Coordinates are already in padded space, so use directly
            const p = this.chart.convertToPixel({ gridIndex: paneIdx }, [point.timeIndex, point.value]);
            if (p) {
                return { x: p[0], y: p[1] };
            }
            return null;
        },
    };

    // Default colors and constants
    private readonly upColor: string = '#00da3c';
    private readonly downColor: string = '#ec0000';
    private readonly defaultPadding = 0.0;
    private padding: number;
    private dataIndexOffset: number = 0; // Offset for phantom padding data

    // DOM Elements for Layout
    private rootContainer: HTMLElement;
    private layoutContainer: HTMLElement;
    private toolbarContainer: HTMLElement; // New Toolbar
    private leftSidebar: HTMLElement;
    private rightSidebar: HTMLElement;
    private chartContainer: HTMLElement;

    constructor(container: HTMLElement, options: QFChartOptions = {}) {
        this.rootContainer = container;
        this.options = {
            title: 'Market',
            height: '600px',
            backgroundColor: '#1e293b',
            upColor: '#00da3c',
            downColor: '#ec0000',
            fontColor: '#cbd5e1',
            fontFamily: 'sans-serif',
            padding: 0.01,
            dataZoom: {
                visible: true,
                position: 'top',
                height: 6,
            },
            layout: {
                mainPaneHeight: '50%',
                gap: 13,
            },
            watermark: true,
            ...options,
        };

        if (this.options.upColor) this.upColor = this.options.upColor;
        if (this.options.downColor) this.downColor = this.options.downColor;
        this.padding = this.options.padding !== undefined ? this.options.padding : this.defaultPadding;

        if (this.options.height) {
            if (typeof this.options.height === 'number') {
                this.rootContainer.style.height = `${this.options.height}px`;
            } else {
                this.rootContainer.style.height = this.options.height;
            }
        }

        // Initialize DOM Layout
        this.rootContainer.innerHTML = '';

        // Layout Container (Flex Row)
        this.layoutContainer = document.createElement('div');
        this.layoutContainer.style.display = 'flex';
        this.layoutContainer.style.width = '100%';
        this.layoutContainer.style.height = '100%';
        this.layoutContainer.style.overflow = 'hidden';
        this.rootContainer.appendChild(this.layoutContainer);

        // Left Sidebar
        this.leftSidebar = document.createElement('div');
        this.leftSidebar.style.display = 'none';
        this.leftSidebar.style.width = '250px'; // Default width
        this.leftSidebar.style.flexShrink = '0';
        this.leftSidebar.style.overflowY = 'auto';
        this.leftSidebar.style.backgroundColor = this.options.backgroundColor || '#1e293b';
        this.leftSidebar.style.borderRight = '1px solid #334155';
        this.leftSidebar.style.padding = '10px';
        this.leftSidebar.style.boxSizing = 'border-box';
        this.leftSidebar.style.color = '#cbd5e1';
        this.leftSidebar.style.fontSize = '12px';
        this.leftSidebar.style.fontFamily = this.options.fontFamily || 'sans-serif';
        this.layoutContainer.appendChild(this.leftSidebar);

        // Toolbar Container
        this.toolbarContainer = document.createElement('div');
        this.layoutContainer.appendChild(this.toolbarContainer);

        // Chart Container
        this.chartContainer = document.createElement('div');
        this.chartContainer.style.flexGrow = '1';
        this.chartContainer.style.height = '100%';
        this.chartContainer.style.overflow = 'hidden';
        this.layoutContainer.appendChild(this.chartContainer);

        // Right Sidebar
        this.rightSidebar = document.createElement('div');
        this.rightSidebar.style.display = 'none';
        this.rightSidebar.style.width = '250px';
        this.rightSidebar.style.flexShrink = '0';
        this.rightSidebar.style.overflowY = 'auto';
        this.rightSidebar.style.backgroundColor = this.options.backgroundColor || '#1e293b';
        this.rightSidebar.style.borderLeft = '1px solid #334155';
        this.rightSidebar.style.padding = '10px';
        this.rightSidebar.style.boxSizing = 'border-box';
        this.rightSidebar.style.color = '#cbd5e1';
        this.rightSidebar.style.fontSize = '12px';
        this.rightSidebar.style.fontFamily = this.options.fontFamily || 'sans-serif';
        this.layoutContainer.appendChild(this.rightSidebar);

        this.chart = echarts.init(this.chartContainer);
        this.pluginManager = new PluginManager(this, this.toolbarContainer);
        this.drawingEditor = new DrawingEditor(this);

        // Bind global chart/ZRender events to the EventBus
        this.chart.on('dataZoom', (params: any) => this.events.emit('chart:dataZoom', params));
        // @ts-ignore - ECharts event handler type mismatch
        this.chart.on('finished', (params: any) => this.events.emit('chart:updated', params)); // General chart update
        // @ts-ignore - ECharts ZRender event handler type mismatch
        this.chart.getZr().on('mousedown', (params: any) => this.events.emit('mouse:down', params));
        // @ts-ignore - ECharts ZRender event handler type mismatch
        this.chart.getZr().on('mousemove', (params: any) => this.events.emit('mouse:move', params));
        // @ts-ignore - ECharts ZRender event handler type mismatch
        this.chart.getZr().on('mouseup', (params: any) => this.events.emit('mouse:up', params));
        // @ts-ignore - ECharts ZRender event handler type mismatch
        this.chart.getZr().on('click', (params: any) => this.events.emit('mouse:click', params));

        const zr = this.chart.getZr();
        const originalSetCursorStyle = zr.setCursorStyle;
        zr.setCursorStyle = function (cursorStyle: string) {
            // Change 'grab' (default roam cursor) to  'crosshair' (more suitable for candlestick chart)
            if (cursorStyle === 'grab') {
                cursorStyle = 'crosshair';
            }
            // Call the original method with your modified style
            originalSetCursorStyle.call(this, cursorStyle);
        };

        // Bind Drawing Events
        this.bindDrawingEvents();

        window.addEventListener('resize', this.resize.bind(this));

        // Listen for fullscreen change to restore state if exited via ESC
        document.addEventListener('fullscreenchange', this.onFullscreenChange);

        // Keyboard listener for deletion
        document.addEventListener('keydown', this.onKeyDown);
    }

    private onKeyDown = (e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedDrawingId) {
            this.removeDrawing(this.selectedDrawingId);
            this.selectedDrawingId = null;
            this.render();
            // Optional: emit deleted event here or in removeDrawing?
            // Since removeDrawing is generic, maybe better here if we want 'deleted by user' nuance.
            // But removeDrawing is called from other places too.
        }
    };

    private onFullscreenChange = () => {
        this.render();
    };

    private bindDrawingEvents() {
        let hideTimeout: any = null;
        let lastHoveredGroup: any = null;

        // Helper to get drawing info
        const getDrawingInfo = (params: any) => {
            if (!params || params.componentType !== 'series' || !params.seriesName?.startsWith('drawings')) {
                return null;
            }

            // Find the drawing
            const paneIndex = params.seriesIndex; // We can't rely on seriesIndex to find pane index easily as it shifts.
            // But we named the series "drawings-pane-{index}".
            const match = params.seriesName.match(/drawings-pane-(\d+)/);
            if (!match) return null;

            const paneIdx = parseInt(match[1]);

            // We stored drawings for this pane in render(), but here we access the flat list?
            // Wait, params.dataIndex is the index in the filtered array passed to that series.
            // We need to re-find the drawing or store metadata.
            // In render(), we map `drawingsByPane`.

            // Efficient way: Re-filter to get the specific drawing.
            // Assuming the order in render() is preserved.
            const paneDrawings = this.drawings.filter((d) => (d.paneIndex || 0) === paneIdx);
            const drawing = paneDrawings[params.dataIndex];

            if (!drawing) return null;

            // Check target for specific part (line or point)
            // ECharts event params.event.target is the graphic element
            const targetName = params.event?.target?.name; // 'line', 'point-start', 'point-end'

            return { drawing, targetName, paneIdx };
        };

        this.chart.on('mouseover', (params: any) => {
            const info = getDrawingInfo(params);
            if (!info) return;

            // Handle visibility of points
            const group = params.event?.target?.parent;
            if (group) {
                // If the drawing is selected, we don't want hover to mess with opacity
                // However, the user might be hovering a DIFFERENT drawing.
                // Let's check the drawing ID from 'info'.
                const isSelected = info.drawing.id === this.selectedDrawingId;

                if (hideTimeout) {
                    clearTimeout(hideTimeout);
                    hideTimeout = null;
                }

                // Show points if not selected (if selected, they are already visible)
                if (!isSelected) {
                    group.children().forEach((child: any) => {
                        if (child.name && child.name.startsWith('point')) {
                            child.attr('style', { opacity: 1 });
                        }
                    });
                }

                // Handle switching groups
                if (lastHoveredGroup && lastHoveredGroup !== group) {
                    // Check if last group belongs to the selected drawing?
                    // We don't have easy access to the drawing ID of 'lastHoveredGroup' unless we stored it.
                    // But we can just iterate and hide points.
                    // Wait, if lastHoveredGroup IS the selected drawing, we should NOT hide points.
                    // We need to know if lastHoveredGroup corresponds to selected drawing.
                    // Storing 'lastHoveredDrawingId' would be better.
                    // Simple fix: We rely on the render() logic which sets opacity: 1 for selected.
                    // If we manually set opacity: 0 via ZRender attr, it might override the initial render state?
                    // Yes, ZRender elements are persistent until re-render.
                    // So we must be careful not to hide points of the selected drawing.
                    // But we don't know the ID of lastHoveredGroup here easily.
                    // Let's modify the hide logic to be safer.
                }
                lastHoveredGroup = group;
            }

            if (info.targetName === 'line') {
                this.events.emit('drawing:hover', {
                    id: info.drawing.id,
                    type: info.drawing.type,
                });
                // Set cursor
                this.chart.getZr().setCursorStyle('move');
            } else if (info.targetName?.startsWith('point')) {
                const pointIdx = info.targetName === 'point-start' ? 0 : 1;
                this.events.emit('drawing:point:hover', {
                    id: info.drawing.id,
                    pointIndex: pointIdx,
                });
                this.chart.getZr().setCursorStyle('pointer');
            }
        });

        this.chart.on('mouseout', (params: any) => {
            const info = getDrawingInfo(params);
            if (!info) return;

            // Hide points (with slight delay or check)
            const group = params.event?.target?.parent;

            // If selected, do not hide points
            if (info.drawing.id === this.selectedDrawingId) {
                // Keep points visible
                return;
            }

            // Delay hide to allow moving between siblings
            hideTimeout = setTimeout(() => {
                if (group) {
                    // Check selection again inside timeout just in case
                    if (this.selectedDrawingId === info.drawing.id) return;

                    group.children().forEach((child: any) => {
                        if (child.name && child.name.startsWith('point')) {
                            child.attr('style', { opacity: 0 });
                        }
                    });
                }
                if (lastHoveredGroup === group) {
                    lastHoveredGroup = null;
                }
            }, 50);

            if (info.targetName === 'line') {
                this.events.emit('drawing:mouseout', { id: info.drawing.id });
            } else if (info.targetName?.startsWith('point')) {
                const pointIdx = info.targetName === 'point-start' ? 0 : 1;
                this.events.emit('drawing:point:mouseout', {
                    id: info.drawing.id,
                    pointIndex: pointIdx,
                });
            }
            this.chart.getZr().setCursorStyle('default');
        });

        this.chart.on('mousedown', (params: any) => {
            const info = getDrawingInfo(params);
            if (!info) return;

            const event = params.event?.event || params.event;
            const x = event?.offsetX;
            const y = event?.offsetY;

            if (info.targetName === 'line') {
                this.events.emit('drawing:mousedown', {
                    id: info.drawing.id,
                    x,
                    y,
                });
            } else if (info.targetName?.startsWith('point')) {
                const pointIdx = info.targetName === 'point-start' ? 0 : 1;
                this.events.emit('drawing:point:mousedown', {
                    id: info.drawing.id,
                    pointIndex: pointIdx,
                    x,
                    y,
                });
            }
        });

        this.chart.on('click', (params: any) => {
            const info = getDrawingInfo(params);
            if (!info) return;

            // Select Drawing logic
            if (this.selectedDrawingId !== info.drawing.id) {
                this.selectedDrawingId = info.drawing.id;
                this.events.emit('drawing:selected', { id: info.drawing.id });
                this.render(); // Re-render to update opacity permanent state
            }

            if (info.targetName === 'line') {
                this.events.emit('drawing:click', { id: info.drawing.id });
            } else if (info.targetName?.startsWith('point')) {
                const pointIdx = info.targetName === 'point-start' ? 0 : 1;
                this.events.emit('drawing:point:click', {
                    id: info.drawing.id,
                    pointIndex: pointIdx,
                });
            }
        });

        // Background click to deselect
        this.chart.getZr().on('click', (params: any) => {
            // If target is undefined or not part of a drawing series we know...
            if (!params.target) {
                if (this.selectedDrawingId) {
                    this.events.emit('drawing:deselected', { id: this.selectedDrawingId });
                    this.selectedDrawingId = null;
                    this.render();
                }
            }
        });
    }

    // --- Plugin System Integration ---

    public getChart(): echarts.ECharts {
        return this.chart;
    }

    public getMarketData(): OHLCV[] {
        return this.marketData;
    }

    public getTimeToIndex(): Map<number, number> {
        return this.timeToIndex;
    }

    public getOptions(): QFChartOptions {
        return this.options;
    }

    public disableTools(): void {
        this.pluginManager.deactivatePlugin();
    }

    public registerPlugin(plugin: Plugin): void {
        this.pluginManager.register(plugin);
    }

    // --- Drawing System ---

    public addDrawing(drawing: import('./types').DrawingElement): void {
        this.drawings.push(drawing);
        this.render(); // Re-render to show new drawing
    }

    public removeDrawing(id: string): void {
        const index = this.drawings.findIndex((d) => d.id === id);
        if (index !== -1) {
            const drawing = this.drawings[index];
            this.drawings.splice(index, 1);
            this.events.emit('drawing:deleted', { id: drawing.id });
            this.render();
        }
    }

    public getDrawing(id: string): import('./types').DrawingElement | undefined {
        return this.drawings.find((d) => d.id === id);
    }

    public updateDrawing(drawing: import('./types').DrawingElement): void {
        const index = this.drawings.findIndex((d) => d.id === drawing.id);
        if (index !== -1) {
            this.drawings[index] = drawing;
            this.render();
        }
    }

    // --- Interaction Locking ---

    private isLocked: boolean = false;
    private lockedState: any = null;

    public lockChart(): void {
        if (this.isLocked) return;
        this.isLocked = true;

        const option = this.chart.getOption() as any;

        // Store current state to restore later if needed (though setOption merge handles most)
        // Actually, simply disabling interactions is enough.

        // We update the option to disable dataZoom and tooltip
        this.chart.setOption({
            dataZoom: option.dataZoom.map((dz: any) => ({ ...dz, disabled: true })),
            tooltip: { show: false }, // Hide tooltip during drag
            // We can also disable series interaction if needed, but custom series is handled by us.
        });
    }

    public unlockChart(): void {
        if (!this.isLocked) return;
        this.isLocked = false;

        const option = this.chart.getOption() as any;

        // Restore interactions
        // We assume dataZoom was enabled before. If not, we might re-enable it wrongly.
        // Ideally we should restore from 'options' or check the previous state.
        // Since 'render' rebuilds everything from 'this.options', we can just call render?
        // But render is expensive.
        // Better: Re-enable based on this.options.

        // Re-enable dataZoom
        const dzConfig = this.options.dataZoom || {};
        const dzVisible = dzConfig.visible ?? true;

        // We can map over current option.dataZoom and set disabled: false
        if (option.dataZoom) {
            this.chart.setOption({
                dataZoom: option.dataZoom.map((dz: any) => ({
                    ...dz,
                    disabled: false,
                })),
                tooltip: { show: true },
            });
        }
    }

    // --------------------------------

    public setZoom(start: number, end: number): void {
        this.chart.dispatchAction({
            type: 'dataZoom',
            start,
            end,
        });
    }

    public setMarketData(data: OHLCV[]): void {
        this.marketData = data;
        this.rebuildTimeIndex();
        this.render();
    }

    /**
     * Update market data incrementally without full re-render
     * Merges new/updated OHLCV data with existing data by timestamp
     *
     * @param data - Array of OHLCV data to merge
     *
     * @remarks
     * **Performance Optimization**: This method only triggers a chart update if the data array contains
     * new or modified bars. If an empty array is passed, no update occurs (expected behavior).
     *
     * **Usage Pattern for Updating Indicators**:
     * When updating both market data and indicators, follow this order:
     *
     * 1. Update indicator data first using `indicator.updateData(plots)`
     * 2. Then call `chart.updateData(newBars)` with the new/modified market data
     *
     * The chart update will trigger a re-render that includes the updated indicator data.
     *
     * **Important**: If you update indicator data without updating market data (e.g., recalculation
     * with same bars), you must still call `chart.updateData([...])` with at least one bar
     * to trigger the re-render. Calling with an empty array will NOT trigger an update.
     *
     * @example
     * ```typescript
     * // Step 1: Update indicator data
     * macdIndicator.updateData({
     *   macd: { data: [{ time: 1234567890, value: 150 }], options: { style: 'line', color: '#2962FF' } }
     * });
     *
     * // Step 2: Update market data (triggers re-render with new indicator data)
     * chart.updateData([
     *   { time: 1234567890, open: 100, high: 105, low: 99, close: 103, volume: 1000 }
     * ]);
     * ```
     *
     * @example
     * ```typescript
     * // If only updating existing bar (e.g., real-time tick updates):
     * const lastBar = { ...existingBar, close: newPrice, high: Math.max(existingBar.high, newPrice) };
     * chart.updateData([lastBar]); // Updates by timestamp
     * ```
     */
    public updateData(data: OHLCV[]): void {
        if (data.length === 0) return;

        // Build a map of existing data by time for O(1) lookups
        const existingTimeMap = new Map<number, OHLCV>();
        this.marketData.forEach((bar) => {
            existingTimeMap.set(bar.time, bar);
        });

        // Track if we added new data or only updated existing
        let hasNewData = false;

        // Merge new data
        data.forEach((bar) => {
            if (!existingTimeMap.has(bar.time)) {
                hasNewData = true;
            }
            existingTimeMap.set(bar.time, bar);
        });

        // Rebuild marketData array sorted by time
        this.marketData = Array.from(existingTimeMap.values()).sort((a, b) => a.time - b.time);

        // Update timeToIndex map
        this.rebuildTimeIndex();

        // Use pre-calculated padding points from rebuildTimeIndex
        const paddingPoints = this.dataIndexOffset;

        // Build candlestick data with padding
        const candlestickData = this.marketData.map((d) => [d.open, d.close, d.low, d.high]);
        const emptyCandle = { value: [NaN, NaN, NaN, NaN], itemStyle: { opacity: 0 } };
        const paddedCandlestickData = [...Array(paddingPoints).fill(emptyCandle), ...candlestickData, ...Array(paddingPoints).fill(emptyCandle)];

        // Build category data with padding
        const categoryData = [
            ...Array(paddingPoints).fill(''),
            ...this.marketData.map((k) => new Date(k.time).toLocaleString()),
            ...Array(paddingPoints).fill(''),
        ];

        // Build indicator series data
        const currentOption = this.chart.getOption() as any;
        const layout = LayoutManager.calculate(this.chart.getHeight(), this.indicators, this.options, this.isMainCollapsed, this.maximizedPaneId);
        const indicatorSeries = SeriesBuilder.buildIndicatorSeries(
            this.indicators,
            this.timeToIndex,
            layout.paneLayout,
            categoryData.length,
            paddingPoints
        );

        // Update only the data arrays in the option, not the full config
        const updateOption: any = {
            xAxis: currentOption.xAxis.map((axis: any, index: number) => ({
                data: categoryData,
            })),
            series: [
                {
                    data: paddedCandlestickData,
                },
                ...indicatorSeries.map((s) => ({
                    data: s.data,
                })),
            ],
        };

        // Merge the update (don't replace entire config)
        this.chart.setOption(updateOption, { notMerge: false });
    }

    public addIndicator(
        id: string,
        plots: { [name: string]: IndicatorPlot },
        options: {
            isOverlay?: boolean;
            height?: number;
            titleColor?: string;
            controls?: { collapse?: boolean; maximize?: boolean };
        } = { isOverlay: false }
    ): Indicator {
        const isOverlay = options.isOverlay ?? false;
        let paneIndex = 0;
        if (!isOverlay) {
            // Find the next available pane index
            // Start from 1, as 0 is the main chart
            let maxPaneIndex = 0;
            this.indicators.forEach((ind) => {
                if (ind.paneIndex > maxPaneIndex) {
                    maxPaneIndex = ind.paneIndex;
                }
            });
            paneIndex = maxPaneIndex + 1;
        }

        // Create Indicator object
        const indicator = new Indicator(id, plots, paneIndex, {
            height: options.height,
            collapsed: false,
            titleColor: options.titleColor,
            controls: options.controls,
        });

        this.indicators.set(id, indicator);
        this.render();
        return indicator;
    }

    // Deprecated: keeping for compatibility if needed, but redirects to addIndicator logic
    public setIndicator(id: string, plot: IndicatorPlot, isOverlay: boolean = false): void {
        // Wrap single plot into the new structure
        this.addIndicator(id, { [id]: plot }, { isOverlay });
    }

    public removeIndicator(id: string): void {
        this.indicators.delete(id);
        this.render();
    }

    public toggleIndicator(id: string, action: 'collapse' | 'maximize' | 'fullscreen' = 'collapse'): void {
        if (action === 'fullscreen') {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                this.rootContainer.requestFullscreen();
            }
            return;
        }

        if (action === 'maximize') {
            if (this.maximizedPaneId === id) {
                // Restore
                this.maximizedPaneId = null;
            } else {
                // Maximize
                this.maximizedPaneId = id;
            }
            this.render();
            return;
        }

        if (id === 'main') {
            this.isMainCollapsed = !this.isMainCollapsed;
            this.render();
            return;
        }
        const indicator = this.indicators.get(id);
        if (indicator) {
            indicator.toggleCollapse();
            this.render();
        }
    }

    public resize(): void {
        this.chart.resize();
    }

    public destroy(): void {
        window.removeEventListener('resize', this.resize.bind(this));
        document.removeEventListener('fullscreenchange', this.onFullscreenChange);
        document.removeEventListener('keydown', this.onKeyDown);
        this.pluginManager.deactivatePlugin(); // Cleanup active tool
        this.pluginManager.destroy(); // Cleanup tooltips
        this.chart.dispose();
    }

    private rebuildTimeIndex(): void {
        this.timeToIndex.clear();
        this.marketData.forEach((k, index) => {
            this.timeToIndex.set(k.time, index);
        });

        // Update dataIndexOffset whenever data changes
        const dataLength = this.marketData.length;
        const paddingPoints = Math.ceil(dataLength * this.padding);
        this.dataIndexOffset = paddingPoints;
    }

    private render(): void {
        if (this.marketData.length === 0) return;

        // Capture current zoom state before rebuilding options
        let currentZoomState: { start: number; end: number } | null = null;
        try {
            const currentOption = this.chart.getOption() as any;
            if (currentOption && currentOption.dataZoom && currentOption.dataZoom.length > 0) {
                // Find the slider or inside zoom component that controls the x-axis
                const zoomComponent = currentOption.dataZoom.find((dz: any) => dz.type === 'slider' || dz.type === 'inside');
                if (zoomComponent) {
                    currentZoomState = {
                        start: zoomComponent.start,
                        end: zoomComponent.end,
                    };
                }
            }
        } catch (e) {
            // Chart might not be initialized yet
        }

        // --- Sidebar Layout Management ---
        const tooltipPos = this.options.databox?.position; // undefined if not present
        const prevLeftDisplay = this.leftSidebar.style.display;
        const prevRightDisplay = this.rightSidebar.style.display;

        // If tooltipPos is undefined, we hide both sidebars and don't use them for tooltips.
        // We only show sidebars if position is explicitly 'left' or 'right'.

        const newLeftDisplay = tooltipPos === 'left' ? 'block' : 'none';
        const newRightDisplay = tooltipPos === 'right' ? 'block' : 'none';

        // Only resize if visibility changed to avoid unnecessary reflows/resizes
        if (prevLeftDisplay !== newLeftDisplay || prevRightDisplay !== newRightDisplay) {
            this.leftSidebar.style.display = newLeftDisplay;
            this.rightSidebar.style.display = newRightDisplay;
            this.chart.resize();
        }
        // ---------------------------------

        // Use pre-calculated padding points from rebuildTimeIndex
        const paddingPoints = this.dataIndexOffset;

        // Create extended category data with empty labels for padding
        const categoryData = [
            ...Array(paddingPoints).fill(''), // Left padding
            ...this.marketData.map((k) => new Date(k.time).toLocaleString()),
            ...Array(paddingPoints).fill(''), // Right padding
        ];

        // 1. Calculate Layout
        const layout = LayoutManager.calculate(this.chart.getHeight(), this.indicators, this.options, this.isMainCollapsed, this.maximizedPaneId);

        // Apply preserved zoom state if available
        if (currentZoomState && layout.dataZoom) {
            layout.dataZoom.forEach((dz) => {
                dz.start = currentZoomState!.start;
                dz.end = currentZoomState!.end;
            });
        }

        // Patch X-Axis with extended data
        layout.xAxis.forEach((axis) => {
            axis.data = categoryData;
            axis.boundaryGap = false; // No additional gap needed, we have phantom data
        });

        // 2. Build Series with phantom data padding
        const candlestickSeries = SeriesBuilder.buildCandlestickSeries(this.marketData, this.options);
        // Extend candlestick data with empty objects (not null) to avoid rendering errors
        const emptyCandle = { value: [NaN, NaN, NaN, NaN], itemStyle: { opacity: 0 } };
        candlestickSeries.data = [...Array(paddingPoints).fill(emptyCandle), ...candlestickSeries.data, ...Array(paddingPoints).fill(emptyCandle)];

        const indicatorSeries = SeriesBuilder.buildIndicatorSeries(
            this.indicators,
            this.timeToIndex,
            layout.paneLayout,
            categoryData.length,
            paddingPoints
        );

        // 3. Build Graphics
        const graphic = GraphicBuilder.build(layout, this.options, this.toggleIndicator.bind(this), this.isMainCollapsed, this.maximizedPaneId);

        // 4. Build Drawings Series (One Custom Series per Pane used)
        const drawingsByPane = new Map<number, import('./types').DrawingElement[]>();
        this.drawings.forEach((d) => {
            const paneIdx = d.paneIndex || 0;
            if (!drawingsByPane.has(paneIdx)) {
                drawingsByPane.set(paneIdx, []);
            }
            drawingsByPane.get(paneIdx)!.push(d);
        });

        const drawingSeriesList: any[] = [];
        drawingsByPane.forEach((drawings, paneIndex) => {
            drawingSeriesList.push({
                type: 'custom',
                name: `drawings-pane-${paneIndex}`,
                xAxisIndex: paneIndex,
                yAxisIndex: paneIndex,
                clip: true,
                renderItem: (params: any, api: any) => {
                    const drawing = drawings[params.dataIndex];
                    if (!drawing) return;

                    const start = drawing.points[0];
                    const end = drawing.points[1];

                    if (!start || !end) return;

                    // Coordinates are already in padded space, use directly
                    const p1 = api.coord([start.timeIndex, start.value]);
                    const p2 = api.coord([end.timeIndex, end.value]);

                    const isSelected = drawing.id === this.selectedDrawingId;

                    if (drawing.type === 'line') {
                        return {
                            type: 'group',
                            children: [
                                {
                                    type: 'line',
                                    name: 'line',
                                    shape: {
                                        x1: p1[0],
                                        y1: p1[1],
                                        x2: p2[0],
                                        y2: p2[1],
                                    },
                                    style: {
                                        stroke: drawing.style?.color || '#3b82f6',
                                        lineWidth: drawing.style?.lineWidth || 2,
                                    },
                                },
                                {
                                    type: 'circle',
                                    name: 'point-start',
                                    shape: { cx: p1[0], cy: p1[1], r: 4 },
                                    style: {
                                        fill: '#fff',
                                        stroke: drawing.style?.color || '#3b82f6',
                                        lineWidth: 1,
                                        opacity: isSelected ? 1 : 0, // Show if selected
                                    },
                                },
                                {
                                    type: 'circle',
                                    name: 'point-end',
                                    shape: { cx: p2[0], cy: p2[1], r: 4 },
                                    style: {
                                        fill: '#fff',
                                        stroke: drawing.style?.color || '#3b82f6',
                                        lineWidth: 1,
                                        opacity: isSelected ? 1 : 0, // Show if selected
                                    },
                                },
                            ],
                        };
                    } else if (drawing.type === 'fibonacci') {
                        const x1 = p1[0];
                        const y1 = p1[1];
                        const x2 = p2[0];
                        const y2 = p2[1];

                        const startX = Math.min(x1, x2);
                        const endX = Math.max(x1, x2);
                        const width = endX - startX;
                        const diffY = y2 - y1;

                        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
                        const colors = ['#787b86', '#f44336', '#ff9800', '#4caf50', '#2196f3', '#00bcd4', '#787b86'];

                        const children: any[] = [];

                        // 1. Diagonal Line
                        children.push({
                            type: 'line',
                            name: 'line', // Use 'line' name to enable dragging logic in DrawingEditor
                            shape: { x1, y1, x2, y2 },
                            style: {
                                stroke: '#999',
                                lineWidth: 1,
                                lineDash: [4, 4],
                            },
                        });

                        // 2. Control Points (invisible by default)
                        children.push({
                            type: 'circle',
                            name: 'point-start',
                            shape: { cx: x1, cy: y1, r: 4 },
                            style: {
                                fill: '#fff',
                                stroke: drawing.style?.color || '#3b82f6',
                                lineWidth: 1,
                                opacity: isSelected ? 1 : 0,
                            },
                            z: 100, // Ensure on top
                        });
                        children.push({
                            type: 'circle',
                            name: 'point-end',
                            shape: { cx: x2, cy: y2, r: 4 },
                            style: {
                                fill: '#fff',
                                stroke: drawing.style?.color || '#3b82f6',
                                lineWidth: 1,
                                opacity: isSelected ? 1 : 0,
                            },
                            z: 100,
                        });

                        // 3. Levels and Backgrounds
                        levels.forEach((level, index) => {
                            const levelY = y2 - diffY * level;
                            const color = colors[index % colors.length];

                            // Horizontal Line
                            children.push({
                                type: 'line',
                                name: 'fib-line', // distinct name, maybe we don't want to drag by clicking these lines? or yes? 'line' triggers drag. 'fib-line' won't unless we update logic.
                                // The user asked for "fib levels between start and end".
                                shape: { x1: startX, y1: levelY, x2: endX, y2: levelY },
                                style: { stroke: color, lineWidth: 1 },
                                silent: true, // Make internal lines silent so clicks pass to background/diagonal?
                            });

                            const startVal = drawing.points[0].value;
                            const endVal = drawing.points[1].value;
                            const valDiff = endVal - startVal;
                            const price = endVal - valDiff * level;

                            children.push({
                                type: 'text',
                                style: {
                                    text: `${level} (${price.toFixed(2)})`,
                                    x: startX + 5,
                                    y: levelY - 10,
                                    fill: color,
                                    fontSize: 10,
                                },
                                silent: true,
                            });

                            // Background
                            if (index < levels.length - 1) {
                                const nextLevel = levels[index + 1];
                                const nextY = y2 - diffY * nextLevel;
                                const rectH = Math.abs(nextY - levelY);
                                const rectY = Math.min(levelY, nextY);

                                children.push({
                                    type: 'rect',
                                    shape: { x: startX, y: rectY, width, height: rectH },
                                    style: {
                                        fill: colors[(index + 1) % colors.length],
                                        opacity: 0.1,
                                    },
                                    silent: true, // Let clicks pass through?
                                });
                            }
                        });

                        const backgrounds: any[] = [];
                        const linesAndText: any[] = [];

                        levels.forEach((level, index) => {
                            const levelY = y2 - diffY * level;
                            const color = colors[index % colors.length];

                            linesAndText.push({
                                type: 'line',
                                shape: { x1: startX, y1: levelY, x2: endX, y2: levelY },
                                style: { stroke: color, lineWidth: 1 },
                                silent: true,
                            });

                            const startVal = drawing.points[0].value;
                            const endVal = drawing.points[1].value;
                            const valDiff = endVal - startVal;
                            const price = endVal - valDiff * level;

                            linesAndText.push({
                                type: 'text',
                                style: {
                                    text: `${level} (${price.toFixed(2)})`,
                                    x: startX + 5,
                                    y: levelY - 10,
                                    fill: color,
                                    fontSize: 10,
                                },
                                silent: true,
                            });

                            if (index < levels.length - 1) {
                                const nextLevel = levels[index + 1];
                                const nextY = y2 - diffY * nextLevel;
                                const rectH = Math.abs(nextY - levelY);
                                const rectY = Math.min(levelY, nextY);

                                backgrounds.push({
                                    type: 'rect',
                                    name: 'line', // Enable dragging by clicking background!
                                    shape: { x: startX, y: rectY, width, height: rectH },
                                    style: {
                                        fill: colors[(index + 1) % colors.length],
                                        opacity: 0.1,
                                    },
                                });
                            }
                        });

                        return {
                            type: 'group',
                            children: [
                                ...backgrounds,
                                ...linesAndText,
                                {
                                    type: 'line',
                                    name: 'line',
                                    shape: { x1, y1, x2, y2 },
                                    style: { stroke: '#999', lineWidth: 1, lineDash: [4, 4] },
                                },
                                {
                                    type: 'circle',
                                    name: 'point-start',
                                    shape: { cx: x1, cy: y1, r: 4 },
                                    style: {
                                        fill: '#fff',
                                        stroke: drawing.style?.color || '#3b82f6',
                                        lineWidth: 1,
                                        opacity: isSelected ? 1 : 0,
                                    },
                                    z: 100,
                                },
                                {
                                    type: 'circle',
                                    name: 'point-end',
                                    shape: { cx: x2, cy: y2, r: 4 },
                                    style: {
                                        fill: '#fff',
                                        stroke: drawing.style?.color || '#3b82f6',
                                        lineWidth: 1,
                                        opacity: isSelected ? 1 : 0,
                                    },
                                    z: 100,
                                },
                            ],
                        };
                    }
                },
                data: drawings.map((d) => [d.points[0].timeIndex, d.points[0].value, d.points[1].timeIndex, d.points[1].value]),
                z: 100,
                silent: false,
            });
        });

        // 5. Tooltip Formatter
        const tooltipFormatter = (params: any[]) => {
            const html = TooltipFormatter.format(params, this.options);
            const mode = this.options.databox?.position; // undefined if not present

            if (mode === 'left') {
                this.leftSidebar.innerHTML = html;
                return ''; // Hide tooltip box
            }
            if (mode === 'right') {
                this.rightSidebar.innerHTML = html;
                return ''; // Hide tooltip box
            }

            if (!this.options.databox) {
                return ''; // No tooltip content
            }

            // Default to floating if databox exists but position is 'floating' (or unspecified but object exists)
            return `<div style="min-width: 200px;">${html}</div>`;
        };

        const option: any = {
            backgroundColor: this.options.backgroundColor,
            animation: false,
            legend: {
                show: false, // Hide default legend as we use tooltip
            },
            tooltip: {
                show: true,
                showContent: !!this.options.databox, // Show content only if databox is present
                trigger: 'axis',
                axisPointer: { type: 'cross', label: { backgroundColor: '#475569' } },
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                borderWidth: 1,
                borderColor: '#334155',
                padding: 10,
                textStyle: {
                    color: '#fff',
                    fontFamily: this.options.fontFamily || 'sans-serif',
                },
                formatter: tooltipFormatter,
                extraCssText: tooltipPos !== 'floating' && tooltipPos !== undefined ? 'display: none !important;' : undefined,
                position: (pos: any, params: any, el: any, elRect: any, size: any) => {
                    const mode = this.options.databox?.position;
                    if (mode === 'floating') {
                        const obj = { top: 10 };
                        obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)] as keyof typeof obj] = 30;
                        return obj;
                    }
                    return null;
                },
            },
            axisPointer: {
                link: { xAxisIndex: 'all' },
                label: { backgroundColor: '#475569' },
            },
            graphic: graphic,
            grid: layout.grid,
            xAxis: layout.xAxis,
            yAxis: layout.yAxis,
            dataZoom: layout.dataZoom,
            series: [candlestickSeries, ...indicatorSeries, ...drawingSeriesList],
        };

        this.chart.setOption(option, true); // true = not merge, replace.
    }
}
