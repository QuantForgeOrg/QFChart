import { EventBus } from "./utils/EventBus";

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
  value: number | null;
  options?: {
    color?: string;
  };
}

export type IndicatorStyle =
  | "line"
  | "columns"
  | "histogram"
  | "circles"
  | "cross"
  | "background";

export interface IndicatorOptions {
  style: IndicatorStyle;
  color: string;
  linewidth?: number;
}

export interface IndicatorPlot {
  data: IndicatorPoint[];
  options: IndicatorOptions;
}

// A collection of plots that make up a single indicator (e.g. MACD has macd line, signal line, histogram)
export interface Indicator {
  id: string;
  plots: { [name: string]: IndicatorPlot };
  paneIndex: number;
  height?: number; // Desired height in percentage (e.g. 15 for 15%)
  collapsed?: boolean;
  titleColor?: string;
}

export interface QFChartOptions {
  title?: string; // Title for the main chart (e.g. "BTC/USDT")
  titleColor?: string;
  backgroundColor?: string;
  upColor?: string;
  downColor?: string;
  fontColor?: string;
  fontFamily?: string;
  padding?: number; // Defaults to 0.2
  height?: string | number;
  dataZoom?: {
    visible?: boolean;
    position?: "top" | "bottom";
    height?: number; // height in %, default 6
  };
  tooltip?: {
    position: "floating" | "left" | "right";
  };
  layout?: {
    mainPaneHeight: string; // e.g. "60%"
    gap: number; // e.g. 5 (percent)
  };
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

  // Drawing Management
  addDrawing(drawing: DrawingElement): void;
  removeDrawing(id: string): void;
}

export type DrawingType = "line";

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
