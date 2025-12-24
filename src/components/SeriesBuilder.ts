import { OHLCV, Indicator as IndicatorType, QFChartOptions, IndicatorPlot } from '../types';
import { PaneConfiguration } from './LayoutManager';
import { textToBase64Image } from '../Utils';

export class SeriesBuilder {
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
            xAxisIndex: 0,
            yAxisIndex: 0,
            z: 5,
        };
    }

    private static getShapeSymbol(shape: string): string {
        // SVG Paths need to be:
        // 1. Valid SVG path data strings
        // 2. Ideally centered around the origin or a standard box (e.g., 0 0 24 24)
        // 3. ECharts path:// format expects just the path data usually, but complex shapes might need 'image://' or better paths.
        // For simple shapes, standard ECharts symbols or simple paths work.

        switch (shape) {
            case 'arrowdown':
                // Blocky arrow down
                return 'path://M12 24l-12-12h8v-12h8v12h8z';

            case 'arrowup':
                // Blocky arrow up
                return 'path://M12 0l12 12h-8v12h-8v-12h-8z';

            case 'circle':
                return 'circle';

            case 'cross':
                // Plus sign (+)
                return 'path://M11 2h2v9h9v2h-9v9h-2v-9h-9v-2h9z';

            case 'diamond':
                return 'diamond'; // Built-in

            case 'flag':
                // Flag on a pole
                return 'path://M6 2v20h2v-8h12l-2-6 2-6h-12z';

            case 'labeldown':
                // Bubble pointing down: Rounded rect with a triangle at bottom
                return 'path://M4 2h16a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-6l-2 4l-2 -4h-6a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2z';

            case 'labelup':
                // Bubble pointing up: Rounded rect with triangle at top
                return 'path://M12 2l2 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h6z';

            case 'square':
                return 'rect';

            case 'triangledown':
                // Pointing down
                return 'path://M12 21l-10-18h20z';

            case 'triangleup':
                // Pointing up
                return 'triangle'; // Built-in is pointing up

            case 'xcross':
                // 'X' shape
                return 'path://M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';

            default:
                return 'circle';
        }
    }

    private static getShapeRotation(shape: string): number {
        // With custom paths defined above, we might not need rotation unless we reuse shapes.
        // Built-in triangle is UP.
        return 0;
    }

    private static getShapeSize(size: string, width?: number, height?: number): number | number[] {
        // If both width and height are specified, use them directly
        if (width !== undefined && height !== undefined) {
            return [width, height];
        }

        // Base size from the size parameter
        let baseSize: number;
        switch (size) {
            case 'tiny':
                baseSize = 8;
                break;
            case 'small':
                baseSize = 12;
                break;
            case 'normal':
            case 'auto':
                baseSize = 16;
                break;
            case 'large':
                baseSize = 24;
                break;
            case 'huge':
                baseSize = 32;
                break;
            default:
                baseSize = 16;
        }

        // If only width is specified, preserve aspect ratio (assume square default)
        if (width !== undefined) {
            return [width, width];
        }

        // If only height is specified, preserve aspect ratio (assume square default)
        if (height !== undefined) {
            return [height, height];
        }

        // Default uniform size
        return baseSize;
    }

    // Helper to determine label position and distance relative to shape BASED ON LOCATION
    private static getLabelConfig(shape: string, location: string): { position: string; distance: number } {
        // Text position should be determined by location, not shape direction

        switch (location) {
            case 'abovebar':
                // Shape is above the candle, text should be above the shape
                return { position: 'top', distance: 5 };

            case 'belowbar':
                // Shape is below the candle, text should be below the shape
                return { position: 'bottom', distance: 5 };

            case 'top':
                // Shape at top of chart, text below it
                return { position: 'bottom', distance: 5 };

            case 'bottom':
                // Shape at bottom of chart, text above it
                return { position: 'top', distance: 5 };

            case 'absolute':
            default:
                // For labelup/down, text is INSIDE the shape
                if (shape === 'labelup' || shape === 'labeldown') {
                    return { position: 'inside', distance: 0 };
                }
                // For other shapes, text above by default
                return { position: 'top', distance: 5 };
        }
    }

    public static buildIndicatorSeries(
        indicators: Map<string, IndicatorType>,
        timeToIndex: Map<number, number>,
        paneLayout: PaneConfiguration[],
        totalDataLength: number,
        dataIndexOffset: number = 0,
        candlestickData?: OHLCV[] // Add candlestick data to access High/Low for positioning
    ): any[] {
        const series: any[] = [];

        indicators.forEach((indicator, id) => {
            if (indicator.collapsed) return; // Skip if collapsed

            // Find axis index
            let xAxisIndex = 0;
            let yAxisIndex = 0;

            if (indicator.paneIndex > 0) {
                // paneLayout contains only separate panes.
                // The index in xAxis/yAxis array is 1 + index_in_paneLayout
                const confIndex = paneLayout.findIndex((p) => p.index === indicator.paneIndex);
                if (confIndex !== -1) {
                    xAxisIndex = confIndex + 1;
                    yAxisIndex = confIndex + 1;
                }
            }

            Object.keys(indicator.plots).forEach((plotName) => {
                const plot = indicator.plots[plotName];
                const seriesName = `${id}::${plotName}`;

                const dataArray = new Array(totalDataLength).fill(null);
                const colorArray = new Array(totalDataLength).fill(null);
                const optionsArray = new Array(totalDataLength).fill(null); // Store per-point options

                plot.data.forEach((point) => {
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
                            colorArray[offsetIndex] = pointColor || plot.options.color;
                            optionsArray[offsetIndex] = point.options || {};
                        }
                    }
                });

                switch (plot.options.style) {
                    case 'histogram':
                    case 'columns':
                        series.push({
                            name: seriesName,
                            type: 'bar',
                            xAxisIndex: xAxisIndex,
                            yAxisIndex: yAxisIndex,
                            data: dataArray.map((val, i) => ({
                                value: val,
                                itemStyle: colorArray[i] ? { color: colorArray[i] } : undefined,
                            })),
                            itemStyle: { color: plot.options.color },
                        });
                        break;

                    case 'circles':
                    case 'cross':
                        // Scatter
                        const scatterData = dataArray
                            .map((val, i) => {
                                if (val === null) return null;
                                const pointColor = colorArray[i] || plot.options.color;
                                const item: any = {
                                    value: [i, val],
                                    itemStyle: { color: pointColor },
                                };

                                if (plot.options.style === 'cross') {
                                    item.symbol = `image://${textToBase64Image('+', pointColor, '24px')}`;
                                    item.symbolSize = 16;
                                } else {
                                    item.symbol = 'circle';
                                    item.symbolSize = 6;
                                }
                                return item;
                            })
                            .filter((item) => item !== null);

                        series.push({
                            name: seriesName,
                            type: 'scatter',
                            xAxisIndex: xAxisIndex,
                            yAxisIndex: yAxisIndex,
                            data: scatterData,
                        });
                        break;

                    case 'shape':
                        const shapeData = dataArray
                            .map((val, i) => {
                                // Merge global options with per-point options to get location first
                                const pointOpts = optionsArray[i] || {};
                                const globalOpts = plot.options;
                                const location = pointOpts.location || globalOpts.location || 'absolute';

                                // For location="absolute", always draw the shape (ignore value)
                                // For other locations, only draw if value is truthy (TradingView behavior)
                                if (location !== 'absolute' && !val) {
                                    return null;
                                }

                                // If we get here and val is null/undefined, it means location is absolute
                                // In that case, we still need a valid value for positioning
                                // Use the value if it exists, otherwise we'd need a fallback
                                // But in TradingView, absolute location still expects a value for Y position
                                if (val === null || val === undefined) {
                                    return null; // Can't plot without a Y coordinate
                                }

                                const color = pointOpts.color || globalOpts.color || 'blue';
                                const shape = pointOpts.shape || globalOpts.shape || 'circle';
                                const size = pointOpts.size || globalOpts.size || 'normal';
                                const text = pointOpts.text || globalOpts.text;
                                const textColor = pointOpts.textcolor || globalOpts.textcolor || 'white';

                                // NEW: Get width and height
                                const width = pointOpts.width || globalOpts.width;
                                const height = pointOpts.height || globalOpts.height;

                                // Debug logging (remove after testing)
                                // if (width !== undefined || height !== undefined) {
                                //     console.log('[Shape Debug]', { shape, width, height, pointOpts, globalOpts });
                                // }

                                // Positioning based on location
                                let yValue = val; // Default to absolute value
                                let symbolOffset: (string | number)[] = [0, 0];

                                if (location === 'abovebar') {
                                    // Shape above the candle
                                    if (candlestickData && candlestickData[i]) {
                                        yValue = candlestickData[i].high;
                                    }
                                    symbolOffset = [0, '-150%']; // Shift up
                                } else if (location === 'belowbar') {
                                    // Shape below the candle
                                    if (candlestickData && candlestickData[i]) {
                                        yValue = candlestickData[i].low;
                                    }
                                    symbolOffset = [0, '150%']; // Shift down
                                } else if (location === 'top') {
                                    // Shape at top of chart - we need to use a very high value
                                    // This would require knowing the y-axis max, which we don't have here easily
                                    // For now, use a placeholder approach - might need to calculate from data
                                    // Or we can use a percentage of the viewport? ECharts doesn't support that directly in scatter.
                                    // Best approach: use a large multiplier of current value or track max
                                    // Simplified: use coordinate system max (will need enhancement)
                                    yValue = val; // For now, keep absolute - would need axis max
                                    symbolOffset = [0, 0];
                                } else if (location === 'bottom') {
                                    // Shape at bottom of chart
                                    yValue = val; // For now, keep absolute - would need axis min
                                    symbolOffset = [0, 0];
                                }

                                const symbol = SeriesBuilder.getShapeSymbol(shape);
                                const symbolSize = SeriesBuilder.getShapeSize(size, width, height);
                                const rotate = SeriesBuilder.getShapeRotation(shape);

                                // Debug logging (remove after testing)
                                // if (width !== undefined || height !== undefined) {
                                //     console.log('[Shape Size Debug]', { symbolSize, width, height, size });
                                // }

                                // Special handling for labelup/down sizing - they contain text so they should be larger
                                let finalSize: number | number[] = symbolSize;
                                if (shape.includes('label')) {
                                    // If custom size, scale it up for labels
                                    if (Array.isArray(symbolSize)) {
                                        finalSize = [symbolSize[0] * 2.5, symbolSize[1] * 2.5];
                                    } else {
                                        finalSize = symbolSize * 2.5;
                                    }
                                }

                                // Get label configuration based on location
                                const labelConfig = SeriesBuilder.getLabelConfig(shape, location);

                                const item: any = {
                                    value: [i, yValue],
                                    symbol: symbol,
                                    symbolSize: finalSize,
                                    symbolRotate: rotate,
                                    symbolOffset: symbolOffset,
                                    itemStyle: {
                                        color: color,
                                    },
                                    label: {
                                        show: !!text,
                                        position: labelConfig.position,
                                        distance: labelConfig.distance,
                                        formatter: text,
                                        color: textColor,
                                        fontSize: 10,
                                        fontWeight: 'bold',
                                    },
                                };

                                return item;
                            })
                            .filter((item) => item !== null);

                        series.push({
                            name: seriesName,
                            type: 'scatter',
                            xAxisIndex: xAxisIndex,
                            yAxisIndex: yAxisIndex,
                            data: shapeData,
                        });
                        break;

                    case 'background':
                        series.push({
                            name: seriesName,
                            type: 'custom',
                            xAxisIndex: xAxisIndex,
                            yAxisIndex: yAxisIndex,
                            z: -10,
                            renderItem: (params: any, api: any) => {
                                const xVal = api.value(0);
                                if (isNaN(xVal)) return;

                                const start = api.coord([xVal, 0]);
                                const size = api.size([1, 0]);
                                const width = size[0];
                                const sys = params.coordSys;
                                const x = start[0] - width / 2;
                                const barColor = colorArray[params.dataIndex];
                                const val = api.value(1);

                                if (!barColor || !val) return;

                                return {
                                    type: 'rect',
                                    shape: {
                                        x: x,
                                        y: sys.y,
                                        width: width,
                                        height: sys.height,
                                    },
                                    style: {
                                        fill: barColor,
                                        opacity: 0.3,
                                    },
                                    silent: true,
                                };
                            },
                            data: dataArray.map((val, i) => [i, val]),
                        });
                        break;

                    case 'step':
                        series.push({
                            name: seriesName,
                            type: 'custom',
                            xAxisIndex: xAxisIndex,
                            yAxisIndex: yAxisIndex,
                            renderItem: (params: any, api: any) => {
                                const x = api.value(0);
                                const y = api.value(1);
                                if (isNaN(y) || y === null) return;

                                const coords = api.coord([x, y]);
                                const width = api.size([1, 0])[0];

                                return {
                                    type: 'line',
                                    shape: {
                                        x1: coords[0] - width / 2,
                                        y1: coords[1],
                                        x2: coords[0] + width / 2,
                                        y2: coords[1],
                                    },
                                    style: {
                                        stroke: colorArray[params.dataIndex] || plot.options.color,
                                        lineWidth: plot.options.linewidth || 1,
                                    },
                                    silent: true,
                                };
                            },
                            data: dataArray.map((val, i) => [i, val]),
                        });
                        break;

                    case 'line':
                    default:
                        series.push({
                            name: seriesName,
                            type: 'custom',
                            xAxisIndex: xAxisIndex,
                            yAxisIndex: yAxisIndex,
                            renderItem: (params: any, api: any) => {
                                const index = params.dataIndex;
                                if (index === 0) return; // Need at least two points for a line segment

                                const y2 = api.value(1);
                                const y1 = api.value(2); // We'll store prevValue in the data

                                if (y2 === null || isNaN(y2) || y1 === null || isNaN(y1)) return;

                                const p1 = api.coord([index - 1, y1]);
                                const p2 = api.coord([index, y2]);

                                return {
                                    type: 'line',
                                    shape: {
                                        x1: p1[0],
                                        y1: p1[1],
                                        x2: p2[0],
                                        y2: p2[1],
                                    },
                                    style: {
                                        stroke: colorArray[index] || plot.options.color,
                                        lineWidth: plot.options.linewidth || 1,
                                    },
                                    silent: true,
                                };
                            },
                            // Data format: [index, value, prevValue]
                            data: dataArray.map((val, i) => [i, val, i > 0 ? dataArray[i - 1] : null]),
                        });
                        break;
                }
            });
        });

        return series;
    }
}
