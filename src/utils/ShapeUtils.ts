export class ShapeUtils {
    public static getShapeSymbol(shape: string): string {
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
}
