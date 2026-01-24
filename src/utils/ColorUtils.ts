export class ColorUtils {
    /**
     * Parse color string and extract opacity
     * Supports: hex (#RRGGBB), named colors (green, red), rgba(r,g,b,a), rgb(r,g,b)
     */
    public static parseColor(colorStr: string): { color: string; opacity: number } {
        if (!colorStr) {
            return { color: '#888888', opacity: 0.2 };
        }

        // Check for rgba format
        const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
            const r = rgbaMatch[1];
            const g = rgbaMatch[2];
            const b = rgbaMatch[3];
            const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;

            // Return rgb color and separate opacity
            return {
                color: `rgb(${r},${g},${b})`,
                opacity: a,
            };
        }

        // For hex or named colors, default opacity to 0.3 for fill areas
        return {
            color: colorStr,
            opacity: 0.3,
        };
    }
}
