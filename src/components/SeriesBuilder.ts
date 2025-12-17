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
                        const offsetIndex = index + dataIndexOffset;
                        dataArray[offsetIndex] = point.value;
                        colorArray[offsetIndex] = point.options?.color || plot.options.color;
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

                    case 'line':
                    default:
                        series.push({
                            name: seriesName,
                            type: 'line',
                            xAxisIndex: xAxisIndex,
                            yAxisIndex: yAxisIndex,
                            smooth: true,
                            showSymbol: false,
                            data: dataArray.map((val, i) => ({
                                value: val,
                                itemStyle: colorArray[i] ? { color: colorArray[i] } : undefined,
                            })),
                            itemStyle: { color: plot.options.color },
                            lineStyle: {
                                width: plot.options.linewidth || 1,
                                color: plot.options.color,
                            },
                        });
                        break;
                }
            });
        });

        return series;
    }
}
