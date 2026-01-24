import { IndicatorPlot, OHLCV } from '../../types';

export interface RenderContext {
    seriesName: string;
    xAxisIndex: number;
    yAxisIndex: number;
    dataArray: any[];
    colorArray: any[];
    optionsArray: any[];
    plotOptions: any;
    candlestickData?: OHLCV[]; // For shape positioning
    plotDataArrays?: Map<string, number[]>; // For fill plots
    indicatorId?: string;
    plotName?: string;
    indicator?: any; // Reference to parent indicator object if needed
}

export interface SeriesRenderer {
    render(context: RenderContext): any;
}
