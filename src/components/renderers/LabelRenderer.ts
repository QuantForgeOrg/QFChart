import { SeriesRenderer, RenderContext } from './SeriesRenderer';
import { ShapeUtils } from '../../utils/ShapeUtils';

export class LabelRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, candlestickData, dataIndexOffset } = context;
        const offset = dataIndexOffset || 0;

        // Collect all non-null, non-deleted label objects from the sparse dataArray.
        // Drawing objects are stored as an array of all labels in a single data entry
        // (since multiple objects at the same bar would overwrite each other in the
        // sparse array). Handle both array-of-objects and single-object entries.
        const labelObjects: any[] = [];
        for (let i = 0; i < dataArray.length; i++) {
            const val = dataArray[i];
            if (!val) continue;
            const items = Array.isArray(val) ? val : [val];
            for (const lbl of items) {
                if (lbl && typeof lbl === 'object' && !lbl._deleted) {
                    labelObjects.push(lbl);
                }
            }
        }

        const labelData = labelObjects
            .map((lbl) => {
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

                // Determine X position using label's own x coordinate
                const xPos = (lbl.xloc === 'bar_index' || lbl.xloc === 'bi') ? (lbl.x + offset) : lbl.x;

                // Determine Y value based on yloc
                let yValue = lbl.y;
                let symbolOffset: (string | number)[] = [0, 0];

                if (yloc === 'abovebar' || yloc === 'AboveBar' || yloc === 'ab') {
                    if (candlestickData && candlestickData[xPos]) {
                        yValue = candlestickData[xPos].high;
                    }
                    symbolOffset = [0, '-150%'];
                } else if (yloc === 'belowbar' || yloc === 'BelowBar' || yloc === 'bl') {
                    if (candlestickData && candlestickData[xPos]) {
                        yValue = candlestickData[xPos].low;
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
                const isBubble = shape === 'labeldown' || shape === 'shape_label_down' ||
                    shape === 'labelup' || shape === 'shape_label_up' ||
                    shape === 'labelleft' || shape === 'labelright';
                // Track label text offset for centering text within the body
                // (excluding the pointer area)
                let labelTextOffset: [number, number] = [0, 0];

                if (isBubble) {
                    // Approximate text width: chars * fontSize * avgCharWidthRatio (bold)
                    const textWidth = text.length * fontSize * 0.65;
                    const minWidth = fontSize * 2.5;
                    const bubbleWidth = Math.max(minWidth, textWidth + fontSize * 1.6);
                    const bubbleHeight = fontSize * 2.8;

                    // SVG pointer takes 3/24 = 12.5% of the path dimension
                    const pointerRatio = 3 / 24;

                    if (shape === 'labelleft' || shape === 'labelright') {
                        // Add extra width for the pointer
                        const totalWidth = bubbleWidth / (1 - pointerRatio);
                        finalSize = [totalWidth, bubbleHeight];

                        // Offset so the pointer tip sits at the anchor x position.
                        const xOff = typeof symbolOffset[0] === 'string' ? 0
                            : (symbolOffset[0] as number);
                        if (shape === 'labelleft') {
                            // Pointer on left → shift bubble body to the right
                            symbolOffset = [xOff + totalWidth * 0.42, symbolOffset[1]];
                            // Shift text right to center within body (not pointer)
                            labelTextOffset = [totalWidth * pointerRatio * 0.5, 0];
                        } else {
                            // Pointer on right → shift bubble body to the left
                            symbolOffset = [xOff - totalWidth * 0.42, symbolOffset[1]];
                            // Shift text left to center within body
                            labelTextOffset = [-totalWidth * pointerRatio * 0.5, 0];
                        }
                    } else {
                        // Vertical pointer (up/down)
                        const totalHeight = bubbleHeight / (1 - pointerRatio);
                        finalSize = [bubbleWidth, totalHeight];

                        // Offset bubble so the pointer tip sits at the anchor price.
                        if (shape === 'labeldown') {
                            symbolOffset = [symbolOffset[0], typeof symbolOffset[1] === 'string'
                                ? symbolOffset[1]
                                : (symbolOffset[1] as number) - totalHeight * 0.42];
                            labelTextOffset = [0, -totalHeight * pointerRatio * 0.5];
                        } else {
                            symbolOffset = [symbolOffset[0], typeof symbolOffset[1] === 'string'
                                ? symbolOffset[1]
                                : (symbolOffset[1] as number) + totalHeight * 0.42];
                            labelTextOffset = [0, totalHeight * pointerRatio * 0.5];
                        }
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
                    value: [xPos, yValue],
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
                        offset: labelTextOffset,
                        formatter: text,
                        color: textcolor,
                        fontSize: fontSize,
                        fontWeight: 'bold',
                        align: isInsideLabel ? 'center'
                            : (textalign === 'align_left' || textalign === 'left') ? 'left'
                            : (textalign === 'align_right' || textalign === 'right') ? 'right'
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
                return 'labelleft';
            case 'label_right':
                return 'labelright';
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
            // All label_* styles render text INSIDE the bubble (TradingView behavior).
            // The left/right/up/down refers to the pointer direction, not text position.
            case 'label_down':
            case 'label_up':
            case 'label_left':
            case 'label_right':
            case 'label_lower_left':
            case 'label_lower_right':
            case 'label_upper_left':
            case 'label_upper_right':
            case 'label_center':
                return 'inside';
            case 'text_outline':
            case 'none':
                // Text only, positioned based on yloc
                return (yloc === 'abovebar' || yloc === 'AboveBar' || yloc === 'ab') ? 'top' : (yloc === 'belowbar' || yloc === 'BelowBar' || yloc === 'bl') ? 'bottom' : 'top';
            default:
                // For simple shapes (circle, diamond, etc.), text goes outside
                return (yloc === 'belowbar' || yloc === 'BelowBar' || yloc === 'bl') ? 'bottom' : 'top';
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
