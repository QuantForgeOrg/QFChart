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

    public static buildIndicatorSeries(
        indicators: Map<string, IndicatorType>,
        timeToIndex: Map<number, number>,
        paneLayout: PaneConfiguration[],
        totalDataLength: number,
        dataIndexOffset: number = 0
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
