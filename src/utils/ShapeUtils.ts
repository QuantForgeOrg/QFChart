export class ShapeUtils {
    public static getShapeSymbol(shape: string): string {
        // SVG Paths need to be:
        // 1. Valid SVG path data strings
        // 2. Ideally centered around the origin or a standard box (e.g., 0 0 24 24)
        // 3. ECharts path:// format expects just the path data usually, but complex shapes might need 'image://' or better paths.
        // For simple shapes, standard ECharts symbols or simple paths work.

        switch (shape) {
            case 'arrowdown':
            case 'shape_arrow_down':
                return 'path://M12 24l-12-12h8v-12h8v12h8z';

            case 'arrowup':
            case 'shape_arrow_up':
                return 'path://M12 0l12 12h-8v12h-8v-12h-8z';

            case 'circle':
            case 'shape_circle':
                return 'circle';

            case 'cross':
            case 'shape_cross':
                return 'path://M11 2h2v9h9v2h-9v9h-2v-9h-9v-2h9z';

            case 'diamond':
            case 'shape_diamond':
                return 'diamond';

            case 'flag':
            case 'shape_flag':
                return 'path://M6 2v20h2v-8h12l-2-6 2-6h-12z';

            case 'labeldown':
            case 'shape_label_down':
                return 'path://M2 1h20a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-8l-2 3-2-3h-8a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z';

            case 'labelleft':
            case 'shape_label_left':
                return 'path://M0 10l3-3v-5a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-18a1 1 0 0 1-1-1v-5z';

            case 'labelright':
            case 'shape_label_right':
                return 'path://M24 10l-3-3v-5a1 1 0 0 0-1-1h-18a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-5z';

            case 'labelup':
            case 'shape_label_up':
                return 'path://M12 1l2 3h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-20a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1h8z';

            case 'square':
            case 'shape_square':
                return 'rect';

            case 'triangledown':
            case 'shape_triangle_down':
                return 'path://M12 21l-10-18h20z';

            case 'triangleup':
            case 'shape_triangle_up':
                return 'triangle';

            case 'xcross':
            case 'shape_xcross':
                return 'path://M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';

            default:
                return 'circle';
        }
    }

    public static getShapeRotation(shape: string): number {
        // With custom paths defined above, we might not need rotation unless we reuse shapes.
        // Built-in triangle is UP.
        return 0;
    }

    public static getShapeSize(size: string, width?: number, height?: number): number | number[] {
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
    public static getLabelConfig(shape: string, location: string): { position: string; distance: number } {
        // Text position should be determined by location, not shape direction

        switch (location) {
            case 'abovebar':
            case 'AboveBar':
                // Shape is above the candle, text should be above the shape
                return { position: 'top', distance: 5 };

            case 'belowbar':
            case 'BelowBar':
                // Shape is below the candle, text should be below the shape
                return { position: 'bottom', distance: 5 };

            case 'top':
            case 'Top':
                // Shape at top of chart, text below it
                return { position: 'bottom', distance: 5 };

            case 'bottom':
            case 'Bottom':
                // Shape at bottom of chart, text above it
                return { position: 'top', distance: 5 };

            case 'absolute':
            case 'Absolute':
            default:
                // For labelup/down, text is INSIDE the shape
                if (shape === 'labelup' || shape === 'labeldown' || shape === 'shape_label_up' || shape === 'shape_label_down') {
                    return { position: 'inside', distance: 0 };
                }
                // For other shapes, text above by default
                return { position: 'top', distance: 5 };
        }
    }
}
