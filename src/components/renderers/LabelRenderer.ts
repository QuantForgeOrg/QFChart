import { SeriesRenderer, RenderContext } from './SeriesRenderer';
import { ShapeUtils } from '../../utils/ShapeUtils';

export class LabelRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, candlestickData } = context;

        const labelData = dataArray
            .map((val, i) => {
                if (val === null || val === undefined) return null;

                // val is a label object: {id, x, y, text, xloc, yloc, color, style, textcolor, size, textalign, tooltip}
                const lbl = typeof val === 'object' ? val : null;
                if (!lbl) return null;

                const text = lbl.text || '';
                const color = lbl.color || '#2962ff';
                const textcolor = lbl.textcolor || '#ffffff';
                const yloc = lbl.yloc || 'price';
                const styleRaw = lbl.style || 'style_label_down';
                const size = lbl.size || 'normal';
                const textalign = lbl.textalign || 'align_center';
                const tooltip = lbl.tooltip || '';

                // Map Pine style string to shape name for ShapeUtils
                const shape = this.styleToShape(styleRaw);

                // Determine Y value based on yloc
                let yValue = lbl.y;
                let symbolOffset: (string | number)[] = [0, 0];

                if (yloc === 'abovebar') {
                    if (candlestickData && candlestickData[i]) {
                        yValue = candlestickData[i].high;
                    }
                    symbolOffset = [0, '-150%'];
                } else if (yloc === 'belowbar') {
                    if (candlestickData && candlestickData[i]) {
                        yValue = candlestickData[i].low;
                    }
                    symbolOffset = [0, '150%'];
                }

                // Get symbol from ShapeUtils
                const symbol = ShapeUtils.getShapeSymbol(shape);
                const symbolSize = ShapeUtils.getShapeSize(size);

                // Compute font size for this label
                const fontSize = this.getSizePx(size);

                // Dynamically size the bubble to fit text content
                let finalSize: number | number[];
                if (shape === 'labeldown' || shape === 'labelup') {
                    // Approximate text width: chars * fontSize * avgCharWidthRatio (bold)
                    const textWidth = text.length * fontSize * 0.65;
                    const minWidth = fontSize * 2.5;
                    const bubbleWidth = Math.max(minWidth, textWidth + fontSize * 1.6);
                    const bubbleHeight = fontSize * 2.8;
                    finalSize = [bubbleWidth, bubbleHeight];

                    // Offset bubble so the pointer tip sits at the anchor price.
                    // The SVG path pointer is ~20% of total height.
                    if (shape === 'labeldown') {
                        symbolOffset = [symbolOffset[0], typeof symbolOffset[1] === 'string'
                            ? symbolOffset[1]
                            : (symbolOffset[1] as number) - bubbleHeight * 0.35];
                    } else {
                        symbolOffset = [symbolOffset[0], typeof symbolOffset[1] === 'string'
                            ? symbolOffset[1]
                            : (symbolOffset[1] as number) + bubbleHeight * 0.35];
                    }
                } else if (shape === 'none') {
                    finalSize = 0;
                } else {
                    if (Array.isArray(symbolSize)) {
                        finalSize = [symbolSize[0] * 1.5, symbolSize[1] * 1.5];
                    } else {
                        finalSize = symbolSize * 1.5;
                    }
                }

                // Determine label position based on style direction
                const labelPosition = this.getLabelPosition(styleRaw, yloc);
                const isInsideLabel = labelPosition === 'inside' ||
                    labelPosition.startsWith('inside');

                const item: any = {
                    value: [i, yValue],
                    symbol: symbol,
                    symbolSize: finalSize,
                    symbolOffset: symbolOffset,
                    itemStyle: {
                        color: color,
                    },
                    label: {
                        show: !!text,
                        position: labelPosition,
                        distance: isInsideLabel ? 0 : 5,
                        formatter: text,
                        color: textcolor,
                        fontSize: fontSize,
                        fontWeight: 'bold',
                        align: isInsideLabel ? 'center'
                            : textalign === 'align_left' ? 'left'
                            : textalign === 'align_right' ? 'right'
                            : 'center',
                        verticalAlign: 'middle',
                        padding: [2, 6],
                    },
                };

                if (tooltip) {
                    item.tooltip = { formatter: tooltip };
                }

                return item;
            })
            .filter((item) => item !== null);

        return {
            name: seriesName,
            type: 'scatter',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            data: labelData,
            z: 20,
        };
    }

    private styleToShape(style: string): string {
        // Strip 'style_' prefix
        const s = style.startsWith('style_') ? style.substring(6) : style;

        switch (s) {
            case 'label_down':
                return 'labeldown';
            case 'label_up':
                return 'labelup';
            case 'label_left':
                return 'labeldown'; // Use labeldown shape, position text left
            case 'label_right':
                return 'labeldown'; // Use labeldown shape, position text right
            case 'label_lower_left':
                return 'labeldown';
            case 'label_lower_right':
                return 'labeldown';
            case 'label_upper_left':
                return 'labelup';
            case 'label_upper_right':
                return 'labelup';
            case 'label_center':
                return 'labeldown';
            case 'circle':
                return 'circle';
            case 'square':
                return 'square';
            case 'diamond':
                return 'diamond';
            case 'flag':
                return 'flag';
            case 'arrowup':
                return 'arrowup';
            case 'arrowdown':
                return 'arrowdown';
            case 'cross':
                return 'cross';
            case 'xcross':
                return 'xcross';
            case 'triangleup':
                return 'triangleup';
            case 'triangledown':
                return 'triangledown';
            case 'text_outline':
                return 'none';
            case 'none':
                return 'none';
            default:
                return 'labeldown';
        }
    }

    private getLabelPosition(style: string, yloc: string): string {
        const s = style.startsWith('style_') ? style.substring(6) : style;

        switch (s) {
            case 'label_down':
                return 'inside';
            case 'label_up':
                return 'inside';
            case 'label_left':
                return 'left';
            case 'label_right':
                return 'right';
            case 'label_lower_left':
                return 'insideBottomLeft';
            case 'label_lower_right':
                return 'insideBottomRight';
            case 'label_upper_left':
                return 'insideTopLeft';
            case 'label_upper_right':
                return 'insideTopRight';
            case 'label_center':
                return 'inside';
            case 'text_outline':
            case 'none':
                // Text only, positioned based on yloc
                return yloc === 'abovebar' ? 'top' : yloc === 'belowbar' ? 'bottom' : 'top';
            default:
                // For simple shapes (circle, diamond, etc.), text goes outside
                return yloc === 'belowbar' ? 'bottom' : 'top';
        }
    }

    private getSizePx(size: string): number {
        switch (size) {
            case 'tiny':
                return 8;
            case 'small':
                return 9;
            case 'normal':
            case 'auto':
                return 10;
            case 'large':
                return 12;
            case 'huge':
                return 14;
            default:
                return 10;
        }
    }
}
