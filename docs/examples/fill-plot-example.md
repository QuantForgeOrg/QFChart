# Fill Plot Style Example

The `fill` plot style allows you to fill the area between two existing plots with a color.

## Usage

```javascript
// Example: Bollinger Bands with filled area
const bbIndicator = {
    id: 'BB',
    plots: {
        upper: {
            data: upperBandData,
            options: {
                style: 'line',
                color: '#2196F3',
                linewidth: 1,
            },
        },
        basis: {
            data: basisData,
            options: {
                style: 'line',
                color: '#FFC107',
                linewidth: 2,
            },
        },
        lower: {
            data: lowerBandData,
            options: {
                style: 'line',
                color: '#2196F3',
                linewidth: 1,
            },
        },
        // Fill between upper and lower bands
        fill: {
            plot1: 'upper', // Reference to upper plot
            plot2: 'lower', // Reference to lower plot
            options: {
                style: 'fill',
                color: 'rgba(33, 150, 243, 0.2)', // Semi-transparent blue
            },
        },
    },
};

chart.addIndicator('BB', bbIndicator.plots, {
    overlay: true,
    titleColor: '#2196F3',
});
```

## Color Formats

The fill color supports multiple formats:

### 1. Hex Color

```javascript
options: {
    style: 'fill',
    color: '#FF5722'
}
```

### 2. Color Name

```javascript
options: {
    style: 'fill',
    color: 'green'
}
```

### 3. RGBA (with transparency)

```javascript
options: {
    style: 'fill',
    color: 'rgba(255, 87, 34, 0.3)' // 30% opacity
}
```

## Requirements

-   Both `plot1` and `plot2` must reference existing plot IDs within the same indicator
-   The referenced plots must be processed before the fill plot (non-fill plots are always processed first)
-   Both plots must be on the same pane for the fill to render correctly
-   If either plot has a `null` value at any point, the fill will not render for that segment

## Notes

-   Fill plots render at `z: -5`, meaning they appear **behind** lines but **above** background plots
-   Fill plots do NOT have a `data` array - they derive their data from the referenced plots
-   The fill is rendered as smooth polygons connecting consecutive points (like TradingView's Bollinger Bands)
-   Gaps in either line are automatically handled - no fill is rendered for those segments
-   **Opacity Handling:**
    -   If using `rgba()` format, the alpha value is extracted and used as opacity
    -   For hex or named colors, default opacity is `0.3` (30% transparent)
    -   Example: `rgba(33, 150, 243, 0.95)` uses 95% opacity
    -   Example: `#2196F3` uses 30% opacity by default
