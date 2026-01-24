import { SeriesRenderer, RenderContext } from './SeriesRenderer';
import { textToBase64Image } from '../../utils/CanvasUtils';

export class ScatterRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, plotOptions } = context;
        const defaultColor = '#2962ff';
        const style = plotOptions.style; // 'circles', 'cross', 'char'

        // Special handling for invisible 'char' style
        if (style === 'char') {
            return {
                name: seriesName,
                type: 'scatter',
                xAxisIndex: xAxisIndex,
                yAxisIndex: yAxisIndex,
                symbolSize: 0, // Invisible
                data: dataArray.map((val, i) => ({
                    value: [i, val],
                    itemStyle: { opacity: 0 },
                })),
                silent: true, // No interaction
            };
        }

        const scatterData = dataArray
            .map((val, i) => {
                if (val === null) return null;
                const pointColor = colorArray[i] || plotOptions.color || defaultColor;
                const item: any = {
                    value: [i, val],
                    itemStyle: { color: pointColor },
                };

                if (style === 'cross') {
                    item.symbol = `image://${textToBase64Image('+', pointColor, '24px')}`;
                    item.symbolSize = 16;
                } else {
                    item.symbol = 'circle';
                    item.symbolSize = 6;
                }
                return item;
            })
            .filter((item) => item !== null);

        return {
            name: seriesName,
            type: 'scatter',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            data: scatterData,
        };
    }
}
