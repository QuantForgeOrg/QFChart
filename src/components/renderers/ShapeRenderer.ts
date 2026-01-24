import { SeriesRenderer, RenderContext } from './SeriesRenderer';
import { ShapeUtils } from '../../utils/ShapeUtils';

export class ShapeRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, optionsArray, plotOptions, candlestickData } = context;
        const defaultColor = '#2962ff';

        const shapeData = dataArray
            .map((val, i) => {
                // Merge global options with per-point options to get location first
                const pointOpts = optionsArray[i] || {};
                const globalOpts = plotOptions;
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

                const color = pointOpts.color || globalOpts.color || defaultColor;
                const shape = pointOpts.shape || globalOpts.shape || 'circle';
                const size = pointOpts.size || globalOpts.size || 'normal';
                const text = pointOpts.text || globalOpts.text;
                const textColor = pointOpts.textcolor || globalOpts.textcolor || 'white';

                // NEW: Get width and height
                const width = pointOpts.width || globalOpts.width;
                const height = pointOpts.height || globalOpts.height;

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

                const symbol = ShapeUtils.getShapeSymbol(shape);
                const symbolSize = ShapeUtils.getShapeSize(size, width, height);
                const rotate = ShapeUtils.getShapeRotation(shape);

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
                const labelConfig = ShapeUtils.getLabelConfig(shape, location);

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

        return {
            name: seriesName,
            type: 'scatter',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            data: shapeData,
        };
    }
}
