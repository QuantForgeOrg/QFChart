import { SeriesRenderer, RenderContext } from './SeriesRenderer';

export class HistogramRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, plotOptions } = context;
        const defaultColor = '#2962ff';

        return {
            name: seriesName,
            type: 'bar',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            data: dataArray.map((val, i) => ({
                value: val,
                itemStyle: colorArray[i] ? { color: colorArray[i] } : undefined,
            })),
            itemStyle: { color: plotOptions.color || defaultColor },
        };
    }
}
