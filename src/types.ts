import { EventBus } from './utils/EventBus';

export interface OHLCV {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface IndicatorPoint {
    time: number;
    value: number | number[] | null;
    options?: {
        color?: string;
        offset?: number;
        wickcolor?: string;
        bordercolor?: string;
    };
}

export type IndicatorStyle =
    | 'line'
    | 'step'
    | 'columns'
    | 'histogram'
    | 'circles'
    | 'cross'
    | 'background'
    | 'shape'
    | 'char'
    | 'bar'
    | 'candle'
    | 'barcolor'
    | 'fill'
    | 'label';

export interface IndicatorOptions {
    style: IndicatorStyle;
    color: string;
    overlay?: boolean; // Override indicator-level overlay setting for this specific plot
    offset?: number;
    linewidth?: number;
    smooth?: boolean;
    shape?: string;
    size?: string;
    text?: string;
    textcolor?: string;
    location?: string;
    width?: number;
    height?: number;
    wickcolor?: string;
    bordercolor?: string;
}

export interface IndicatorPlot {
    data?: IndicatorPoint[]; // Optional for fill plots
    options: IndicatorOptions;
    plot1?: string; // For fill plots: reference to first plot ID
    plot2?: string; // For fill plots: reference to second plot ID
}

// A collection of plots that make up a single indicator (e.g. MACD has macd line, signal line, histogram)
export interface Indicator {
    id: string;
    plots: { [name: string]: IndicatorPlot };
    paneIndex: number;
    height?: number; // Desired height in percentage (e.g. 15 for 15%)
    collapsed?: boolean;
    titleColor?: string;
    controls?: {
        collapse?: boolean;
        maximize?: boolean;
    };
}

export interface QFChartOptions {
    title?: string; // Title for the main chart (e.g. "BTC/USDT")
    titleColor?: string;
    backgroundColor?: string;
    upColor?: string;
    downColor?: string;
    fontColor?: string;
    fontFamily?: string;
    padding?: number; // Horizontal padding (empty candles on sides), defaults to 0.2
    yAxisPadding?: number; // Vertical Y-axis padding in percentage (e.g., 5 = 5% padding), defaults to 5
    yAxisMin?: number | 'auto'; // Fixed minimum value for main Y-axis, or 'auto' for dynamic
    yAxisMax?: number | 'auto'; // Fixed maximum value for main Y-axis, or 'auto' for dynamic
    yAxisLabelFormatter?: (value: number) => string; // Custom formatter function for Y-axis labels
    yAxisDecimalPlaces?: number; // Number of decimal places for Y-axis labels. If undefined, auto-detected from data.
    lastPriceLine?: {
        // Configuration for the horizontal line showing the last price
        visible?: boolean;
        color?: string; // Defaults to current candle color or '#fff'
        lineStyle?: 'solid' | 'dashed' | 'dotted'; // Defaults to 'dashed'
        showCountdown?: boolean; // Show countdown to bar close
    };
    interval?: number; // Bar interval in milliseconds (required for countdown)
    height?: string | number;
    controls?: {
        collapse?: boolean;
        maximize?: boolean;
        fullscreen?: boolean;
    };
    dataZoom?: {
        visible?: boolean;
        position?: 'top' | 'bottom';
        height?: number; // height in %, default 6
        start?: number; // 0-100, default 50
        end?: number; // 0-100, default 100
        zoomOnTouch?: boolean; // Enable inside zoom on touch devices, default true
    };
    databox?: {
        position: 'floating' | 'left' | 'right';
        triggerOn?: 'mousemove' | 'click' | 'none'; // When to show tooltip/crosshair, default 'mousemove'
    };
    layout?: {
        mainPaneHeight: string; // e.g. "60%"
        gap: number; // e.g. 5 (percent)
    };
    watermark?: boolean; // Default true
}

// Plugin System Types

export interface Coordinate {
    x: number;
    y: number;
}

export interface DataCoordinate {
    timeIndex: number;
    value: number;
    paneIndex?: number; // Optional pane index
}

export interface ChartContext {
    // Core Access
    getChart(): any; // echarts.ECharts instance
    getMarketData(): OHLCV[];
    getTimeToIndex(): Map<number, number>;
    getOptions(): QFChartOptions;

    // Event Bus
    events: EventBus;

    // Helpers
    coordinateConversion: {
        pixelToData: (point: Coordinate) => DataCoordinate | null;
        dataToPixel: (point: DataCoordinate) => Coordinate | null;
    };

    // Interaction Control
    disableTools(): void; // To disable other active tools

    // Zoom Control
    setZoom(start: number, end: number): void;

    // Drawing Management
    addDrawing(drawing: DrawingElement): void;
    removeDrawing(id: string): void;
    getDrawing(id: string): DrawingElement | undefined;
    updateDrawing(drawing: DrawingElement): void;

    // Interaction Locking
    lockChart(): void;
    unlockChart(): void;
}

export type DrawingType = 'line' | 'fibonacci';

export interface DrawingElement {
    id: string;
    type: DrawingType;
    points: DataCoordinate[]; // [start, end]
    paneIndex?: number; // Pane where this drawing belongs (default 0)
    style?: {
        color?: string;
        lineWidth?: number;
    };
}

export interface PluginConfig {
    id: string;
    name?: string;
    icon?: string;
    hotkey?: string;
}

export interface Plugin {
    id: string;
    name?: string;
    icon?: string;

    init(context: ChartContext): void;

    // Called when the tool button is clicked/activated
    activate?(): void;

    // Called when the tool is deactivated
    deactivate?(): void;

    // Cleanup when plugin is removed
    destroy?(): void;
}
