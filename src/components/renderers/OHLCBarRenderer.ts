import { SeriesRenderer, RenderContext } from './SeriesRenderer';

export class OHLCBarRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, optionsArray, plotOptions } = context;
        const defaultColor = '#2962ff';
        const isCandle = plotOptions.style === 'candle';

        const ohlcData = dataArray
            .map((val, i) => {
                if (val === null || !Array.isArray(val) || val.length !== 4) return null;

                const [open, high, low, close] = val;
                const pointOpts = optionsArray[i] || {};
                const color = pointOpts.color || colorArray[i] || plotOptions.color || defaultColor;
                const wickColor = pointOpts.wickcolor || plotOptions.wickcolor || color;
                const borderColor = pointOpts.bordercolor || plotOptions.bordercolor || wickColor;

                // Store colors in value array at positions 5, 6, and 7 for access in renderItem
                return [i, open, close, low, high, color, wickColor, borderColor];
            })
            .filter((item) => item !== null);

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            renderItem: (params: any, api: any) => {
                const xValue = api.value(0);
                const openValue = api.value(1);
                const closeValue = api.value(2);
                const lowValue = api.value(3);
                const highValue = api.value(4);
                const color = api.value(5);
                const wickColor = api.value(6);
                const borderColor = api.value(7);

                if (isNaN(openValue) || isNaN(closeValue) || isNaN(lowValue) || isNaN(highValue)) {
                    return null;
                }

                const xPos = api.coord([xValue, 0])[0];
                const openPos = api.coord([xValue, openValue])[1];
                const closePos = api.coord([xValue, closeValue])[1];
                const lowPos = api.coord([xValue, lowValue])[1];
                const highPos = api.coord([xValue, highValue])[1];

                const barWidth = api.size([1, 0])[0] * 0.6;

                if (isCandle) {
                    // Classic candlestick rendering
                    const bodyTop = Math.min(openPos, closePos);
                    const bodyBottom = Math.max(openPos, closePos);
                    const bodyHeight = Math.abs(closePos - openPos);

                    return {
                        type: 'group',
                        children: [
                            // Upper wick
                            {
                                type: 'line',
                                shape: {
                                    x1: xPos,
                                    y1: highPos,
                                    x2: xPos,
                                    y2: bodyTop,
                                },
                                style: {
                                    stroke: wickColor,
                                    lineWidth: 1,
                                },
                            },
                            // Lower wick
                            {
                                type: 'line',
                                shape: {
                                    x1: xPos,
                                    y1: bodyBottom,
                                    x2: xPos,
                                    y2: lowPos,
                                },
                                style: {
                                    stroke: wickColor,
                                    lineWidth: 1,
                                },
                            },
                            // Body
                            {
                                type: 'rect',
                                shape: {
                                    x: xPos - barWidth / 2,
                                    y: bodyTop,
                                    width: barWidth,
                                    height: bodyHeight || 1, // Minimum height for doji
                                },
                                style: {
                                    fill: color,
                                    stroke: borderColor,
                                    lineWidth: 1,
                                },
                            },
                        ],
                    };
                } else {
                    // Bar style (OHLC bar)
                    const tickWidth = barWidth * 0.5;

                    return {
                        type: 'group',
                        children: [
                            // Vertical line (low to high)
                            {
                                type: 'line',
                                shape: {
                                    x1: xPos,
                                    y1: lowPos,
                                    x2: xPos,
                                    y2: highPos,
                                },
                                style: {
                                    stroke: color,
                                    lineWidth: 1,
                                },
                            },
                            // Open tick (left)
                            {
                                type: 'line',
                                shape: {
                                    x1: xPos - tickWidth,
                                    y1: openPos,
                                    x2: xPos,
                                    y2: openPos,
                                },
                                style: {
                                    stroke: color,
                                    lineWidth: 1,
                                },
                            },
                            // Close tick (right)
                            {
                                type: 'line',
                                shape: {
                                    x1: xPos,
                                    y1: closePos,
                                    x2: xPos + tickWidth,
                                    y2: closePos,
                                },
                                style: {
                                    stroke: color,
                                    lineWidth: 1,
                                },
                            },
                        ],
                    };
                }
            },
            data: ohlcData,
        };
    }
}
