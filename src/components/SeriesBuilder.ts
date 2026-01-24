import { OHLCV, Indicator as IndicatorType, QFChartOptions, IndicatorPlot, IndicatorStyle } from '../types';
import { PaneConfiguration } from './LayoutManager';
import { SeriesRendererFactory } from './SeriesRendererFactory';

export class SeriesBuilder {
    private static readonly DEFAULT_COLOR = '#2962ff';

    public static buildCandlestickSeries(marketData: OHLCV[], options: QFChartOptions, totalLength?: number): any {
        const upColor = options.upColor || '#00da3c';
        const downColor = options.downColor || '#ec0000';

        const data = marketData.map((d) => [d.open, d.close, d.low, d.high]);

        // Pad with nulls if totalLength is provided and greater than current data length
        if (totalLength && totalLength > data.length) {
            const padding = totalLength - data.length;
            for (let i = 0; i < padding; i++) {
                data.push(null as any);
            }
        }

        // Build markLine for last price if enabled
        let markLine = undefined;
        if (options.lastPriceLine?.visible !== false && marketData.length > 0) {
            const lastBar = marketData[marketData.length - 1];
            const lastClose = lastBar.close;
            const isUp = lastBar.close >= lastBar.open;
            // Use configured color, or dynamic color based on candle direction
            const lineColor = options.lastPriceLine?.color || (isUp ? upColor : downColor);
            let lineStyleType = options.lastPriceLine?.lineStyle || 'dashed';

            if (lineStyleType.startsWith('linestyle_')) {
                lineStyleType = lineStyleType.replace('linestyle_', '') as any;
            }
            markLine = {
                symbol: ['none', 'none'],
                data: [
                    {
                        yAxis: lastClose,
                        label: {
                            show: true,
                            position: 'end', // Right side
                            formatter: (params: any) => {
                                // Respect Y-axis formatting options
                                if (options.yAxisLabelFormatter) {
                                    return options.yAxisLabelFormatter(params.value);
                                }
                                const decimals = options.yAxisDecimalPlaces !== undefined ? options.yAxisDecimalPlaces : 2;
                                return typeof params.value === 'number' ? params.value.toFixed(decimals) : params.value;
                            },
                            color: '#fff',
                            backgroundColor: lineColor,
                            padding: [2, 4],
                            borderRadius: 2,
                            fontSize: 11,
                            fontWeight: 'bold',
                        },
                        lineStyle: {
                            color: lineColor,
                            type: lineStyleType,
                            width: 1,
                            opacity: 0.8,
                        },
                    },
                ],
                animation: false,
                silent: true, // Disable interaction
            };
        }

        return {
            type: 'candlestick',
            name: options.title || 'Market',
            data: data,
            itemStyle: {
                color: upColor,
                color0: downColor,
                borderColor: upColor,
                borderColor0: downColor,
            },
            markLine: markLine,
            xAxisIndex: 0,
            yAxisIndex: 0,
            z: 5,
        };
    }

    public static buildIndicatorSeries(
        indicators: Map<string, IndicatorType>,
        timeToIndex: Map<number, number>,
        paneLayout: PaneConfiguration[],
        totalDataLength: number,
        dataIndexOffset: number = 0,
        candlestickData?: OHLCV[], // Add candlestick data to access High/Low for positioning
        overlayYAxisMap?: Map<string, number>, // Map of overlay indicator IDs to their Y-axis indices
        separatePaneYAxisOffset: number = 1 // Offset for separate pane Y-axes (accounts for overlay axes)
    ): { series: any[]; barColors: (string | null)[] } {
        const series: any[] = [];
        const barColors: (string | null)[] = new Array(totalDataLength).fill(null);

        // Store plot data arrays for fill plots to reference
        const plotDataArrays = new Map<string, number[]>();

        indicators.forEach((indicator, id) => {
            if (indicator.collapsed) return; // Skip if collapsed

            // Sort plots so that 'fill' plots are processed last
            // This ensures that the plots they reference (plot1, plot2) have already been processed and their data stored
            const sortedPlots = Object.keys(indicator.plots).sort((a, b) => {
                const plotA = indicator.plots[a];
                const plotB = indicator.plots[b];
                const isFillA = plotA.options.style === 'fill';
                const isFillB = plotB.options.style === 'fill';
                if (isFillA && !isFillB) return 1;
                if (!isFillA && isFillB) return -1;
                return 0;
            });

            sortedPlots.forEach((plotName) => {
                const plot = indicator.plots[plotName];
                const seriesName = `${id}::${plotName}`;

                // Find axis index for THIS SPECIFIC PLOT
                let xAxisIndex = 0;
                let yAxisIndex = 0;

                // Check plot-level overlay setting (overrides indicator-level setting)
                const plotOverlay = plot.options.overlay;
                const isPlotOverlay = plotOverlay !== undefined ? plotOverlay : indicator.paneIndex === 0;

                if (isPlotOverlay) {
                    // Plot should be on main chart (overlay)
                    xAxisIndex = 0;
                    if (overlayYAxisMap && overlayYAxisMap.has(seriesName)) {
                        // This specific plot has its own Y-axis (incompatible with price range)
                        yAxisIndex = overlayYAxisMap.get(seriesName)!;
                    } else {
                        // Shares main Y-axis with candlesticks
                        yAxisIndex = 0;
                    }
                } else {
                    // Plot should be in indicator's separate pane
                    const confIndex = paneLayout.findIndex((p) => p.index === indicator.paneIndex);
                    if (confIndex !== -1) {
                        xAxisIndex = confIndex + 1;
                        yAxisIndex = separatePaneYAxisOffset + confIndex;
                    }
                }

                // Prepare data arrays
                // For 'fill' style, we don't use plot.data directly in the same way, but we initialize generic arrays
                const dataArray = new Array(totalDataLength).fill(null);
                const colorArray = new Array(totalDataLength).fill(null);
                const optionsArray = new Array(totalDataLength).fill(null); // Store per-point options

                plot.data?.forEach((point) => {
                    const index = timeToIndex.get(point.time);
                    if (index !== undefined) {
                        const plotOffset = point.options?.offset ?? plot.options.offset ?? 0;
                        const offsetIndex = index + dataIndexOffset + plotOffset;

                        if (offsetIndex >= 0 && offsetIndex < totalDataLength) {
                            let value = point.value;
                            const pointColor = point.options?.color;

                            // TradingView compatibility: if color is 'na' (NaN, null, or "na"), break the line
                            const isNaColor =
                                pointColor === null ||
                                pointColor === 'na' ||
                                pointColor === 'NaN' ||
                                (typeof pointColor === 'number' && isNaN(pointColor));

                            if (isNaColor) {
                                value = null;
                            }

                            dataArray[offsetIndex] = value;
                            colorArray[offsetIndex] = pointColor || plot.options.color || SeriesBuilder.DEFAULT_COLOR;
                            optionsArray[offsetIndex] = point.options || {};
                        }
                    }
                });

                // Store data array for fill plots to reference
                // Only store for non-fill plots as fill plots don't produce data to be referenced by other fills (usually)
                plotDataArrays.set(`${id}::${plotName}`, dataArray);

                if (plot.options?.style?.startsWith('style_')) {
                    plot.options.style = plot.options.style.replace('style_', '') as IndicatorStyle;
                }

                // Handle barcolor specifically as it modifies shared state (barColors)
                if (plot.options.style === 'barcolor') {
                    // Apply colors to main chart candlesticks
                    plot.data?.forEach((point) => {
                        const index = timeToIndex.get(point.time);
                        if (index !== undefined) {
                            const plotOffset = point.options?.offset ?? plot.options.offset ?? 0;
                            const offsetIndex = index + dataIndexOffset + plotOffset;

                            if (offsetIndex >= 0 && offsetIndex < totalDataLength) {
                                const pointColor = point.options?.color || plot.options.color || SeriesBuilder.DEFAULT_COLOR;
                                const isNaColor =
                                    pointColor === null ||
                                    pointColor === 'na' ||
                                    pointColor === 'NaN' ||
                                    (typeof pointColor === 'number' && isNaN(pointColor));

                                if (!isNaColor && point.value !== null && point.value !== undefined) {
                                    barColors[offsetIndex] = pointColor;
                                }
                            }
                        }
                    });
                    return; // Skip rendering a series for barcolor
                }

                // Use Factory to get appropriate renderer
                const renderer = SeriesRendererFactory.get(plot.options.style);
                const seriesConfig = renderer.render({
                    seriesName,
                    xAxisIndex,
                    yAxisIndex,
                    dataArray,
                    colorArray,
                    optionsArray,
                    plotOptions: plot.options,
                    candlestickData,
                    plotDataArrays,
                    indicatorId: id,
                    plotName: plotName
                });

                if (seriesConfig) {
                    series.push(seriesConfig);
                }
            });
        });

        return { series, barColors };
    }
}
