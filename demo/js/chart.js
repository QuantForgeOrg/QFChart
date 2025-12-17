function textToBase64Image(text, color = "#00da3c", fontSize = "64px") {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 32;
  canvas.height = 32;

  if (ctx) {
    ctx.font = "bold " + fontSize + " Arial"; // or any font
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 16, 16);

    return canvas.toDataURL("image/png");
  }
  return "";
}
const DATA_LENGTH = 500;
const upColor = "#00da3c";
const downColor = "#ec0000";
const PADDING = 0.2;

let mainChart; // Store chart instance reference

async function loadIndicatorData() {
  try {
    const data = await indicator("BTCUSDT", "W", DATA_LENGTH);
    console.log(data);
    return data;
  } catch (error) {
    console.error("Error loading indicator data:", error);
    return null;
  }
}

function splitData(rawData) {
  let categoryData = [];
  let values = [];
  let volumes = [];
  for (let i = 0; i < rawData.length; i++) {
    const openTime = rawData[i][0];
    categoryData.push(new Date(openTime).toLocaleString());

    values.push([
      rawData[i][1],
      rawData[i][3],
      rawData[i][4],
      rawData[i][2],
      rawData[i][5],
    ]);
    volumes.push([i, rawData[i][5], rawData[i][1] > rawData[i][2] ? 1 : -1]);
  }
  return {
    categoryData: categoryData,
    values: values,
    volumes: volumes,
  };
}

function renderIndicatorSeries(indicatorData, marketData) {
  const series = [];
  const timeToIndex = new Map();
  marketData.forEach((k, index) => {
    timeToIndex.set(k[0], index);
  });

  for (let plotName in indicatorData) {
    const plot = indicatorData[plotName];

    // Create a full-length array with null for missing data to ensure proper alignment
    const dataArray = new Array(marketData.length).fill(null);
    const colorArray = new Array(marketData.length).fill(null);

    plot.data.forEach((point) => {
      // Heuristic to handle both seconds and milliseconds
      // If time is small (e.g. < 10 billion), assume seconds and convert to ms
      const pointTime =
        point.time < 10000000000 ? point.time * 1000 : point.time;

      // Try exact match first
      let index = timeToIndex.get(pointTime);

      // If not found, try rounding (in case of float inaccuracies)
      if (index === undefined) {
        index = timeToIndex.get(Math.round(pointTime));
      }

      if (index !== undefined) {
        dataArray[index] = point.value;
        colorArray[index] = point.options?.color;
      } else {
        // Console log only once to avoid spam
        if (Math.random() < 0.001) {
          console.warn(
            `Could not map point time ${point.time} (converted: ${pointTime}) to any market data index. Sample market key: ${marketData[0]?.openTime}`
          );
        }
      }
    });

    switch (plot.options.style) {
      case "line":
        series.push({
          name: plotName,
          type: "line",
          xAxisIndex: 1,
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          data: dataArray.map((val, i) => ({
            value: val,
            itemStyle: colorArray[i] ? { color: colorArray[i] } : undefined,
          })),
          itemStyle: {
            color: plot.options.color,
          },
          lineStyle: {
            width: plot.options.linewidth,
            color: plot.options.color,
          },
        });
        break;
      case "columns": // Added columns
      case "histogram":
        series.push({
          name: plotName,
          type: "bar",
          xAxisIndex: 1,
          yAxisIndex: 1,
          barWidth: "70%",
          barGap: "-100%", // Changed from 30% to -100% to match new code
          barCategoryGap: "0%", // Added to match new code
          large: true,
          //largeThreshold: 100,
          data: dataArray.map((val, i) => ({
            value: val,
            itemStyle: colorArray[i]
              ? { color: colorArray[i] }
              : { color: val >= 0 ? upColor : downColor },
          })),
          z: 2, // Added z-index
          emphasis: false, // Added emphasis
          itemStyle: {
            // Fallback logic handled in data map
          },
        });
        break;
      case "circles": // Added circles
      case "cross":
        const isCross = plot.options.style === "cross";

        // Pre-generate the base symbol for performance if it's not a cross
        // For cross, we'll generate per-point to support dynamic colors
        // ECharts doesn't support a callback for 'symbol' property at series level for custom images,
        // so we must define the symbol (image) individually for each data point to achieve different colors.
        const baseSymbol = isCross ? "rect" : "circle";

        const scatterData = dataArray
          .map((val, i) => {
            if (val === null) return null;

            const pointColor = colorArray[i] || plot.options.color;

            // Create the data item
            const item = {
              value: [i, val, pointColor],
              itemStyle: {
                color: pointColor,
              },
            };

            // If it's a cross, we need to generate a specific image for this color
            // because 'symbol' property doesn't support color callback for custom images.
            // We generate a base64 image of a "+" sign with the specific point color.
            if (isCross) {
              item.symbol = `image://${textToBase64Image(
                "+",
                pointColor,
                "24px"
              )}`;
              item.symbolSize = 16;
            } else {
              item.symbol = "circle";
              item.symbolSize = 6;
            }

            return item;
          })
          .filter((item) => item !== null);

        series.push({
          name: plotName,
          type: "scatter",
          xAxisIndex: 1,
          yAxisIndex: 1,
          // symbol: symbol, // Symbol is now handled per-data-item to support dynamic colors
          // symbolSize: isCross ? 16 : 6,
          data: scatterData,
        });
        break;
      case "background": // Added background
        series.push({
          name: plotName,
          type: "bar",
          xAxisIndex: 1,
          yAxisIndex: 1,
          barWidth: "100%",
          barGap: "-100%",
          z: -10, // Make sure it's behind everything
          data: colorArray.map((color, i) => ({
            value: color ? 100 : null, // Only show bar where there's a color
            itemStyle: color ? { color: color, opacity: 0.3 } : undefined,
          })),
        });
        break;
    }
  }
  return series;
}

async function initializeCharts(OHLCVData, indicatorsData) {
  mainChart = echarts.init(document.getElementById("main-chart"));

  const candlestickData = splitData(OHLCVData);

  console.log(candlestickData.values);

  // Update series configuration
  const option = {
    backgroundColor: "#1e293b",
    animation: false,
    legend: {
      bottom: 10,
      left: "center",
      data: ["BTCUSDT", "Indicator"],
      textStyle: {
        color: "#cbd5e1",
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
        label: {
          backgroundColor: "#475569",
        },
      },
      backgroundColor: "rgba(30, 41, 59, 0.9)",
      borderWidth: 1,
      borderColor: "#334155",
      padding: 10,
      textStyle: {
        color: "#fff",
      },
      position: function (pos, params, el, elRect, size) {
        return [0, 0];
      },
      formatter: function (params, ticket, callback) {
        //console.log(params, ticket, callback);
        return (
          params[0].marker +
          " | " +
          params[0].seriesName +
          " | " +
          JSON.stringify(params[0].data)
        );
      },
    },
    axisPointer: {
      link: { xAxisIndex: "all" },
      label: {
        backgroundColor: "#475569",
      },
    },
    toolbox: {
      feature: {
        dataZoom: {
          yAxisIndex: false,
        },
        brush: {
          type: ["lineX", "clear"],
        },
      },
    },
    brush: {
      xAxisIndex: "all",
      brushLink: "all",
      outOfBrush: {
        colorAlpha: 0.1,
      },
    },
    grid: [
      {
        left: "8%",
        right: "10%",
        height: "50%",
      },
      {
        left: "8%",
        right: "10%",
        top: "63%",
        height: "16%",
      },
    ],
    xAxis: [
      {
        type: "category",
        data: candlestickData.categoryData,
        scale: true,
        boundaryGap: false,
        axisLine: {
          onZero: false,
          lineStyle: {
            color: "#94a3b8",
          },
        },
        axisLabel: {
          color: "#94a3b8",
        },
        splitLine: {
          show: false,
        },
        splitNumber: 20,
        min: (value) => {
          //console.log('min', value);
          const dataMin = value.min;
          const range = value.max - value.min;
          return dataMin + range * PADDING; // Add 20% padding to left
        },
        max: (value) => {
          //console.log('max', value);
          const dataMax = value.max;
          const range = value.max - value.min;
          return dataMax + range * PADDING; // Add 20% padding to right
        },
        axisPointer: {
          z: 100,
        },
      },
      {
        type: "category",
        gridIndex: 1,
        data: candlestickData.categoryData,
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        splitNumber: 20,
        min: (value) => {
          //console.log('min', value);
          const dataMin = value.min;
          const range = value.max - value.min;
          return dataMin + range * PADDING; // Add 20% padding to left
        },
        max: (value) => {
          //console.log('max', value);
          const dataMax = value.max;
          const range = value.max - value.min;
          return dataMax + range * PADDING; // Add 20% padding to right
        },
      },
    ],

    yAxis: [
      {
        position: "right",
        scale: true,
        splitArea: {
          show: true,
          interval: function (index) {
            return index % 2 === 0;
          },
          areaStyle: {
            color: ["rgba(45, 55, 72, 0.5)", "rgba(30, 41, 59, 0.8)"],
          },
        },
        axisLine: {
          lineStyle: {
            color: "#94a3b8",
          },
        },
        axisLabel: {
          color: "#94a3b8",
        },
        splitLine: { show: false },
      },
      {
        position: "right",
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: {
          show: true,
          color: "#94a3b8",
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: "#94a3b8",
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: [0, 1],
        start: 50,
        end: 100,

        backgroundColor: "#1e293b",
        dataBackground: {
          lineStyle: {
            color: "#475569",
          },
          areaStyle: {
            color: "#475569",
          },
        },
        fillerColor: "rgba(71, 85, 105, 0.2)",
        borderColor: "#334155",
      },
      {
        show: true,
        xAxisIndex: [0, 1],
        type: "slider",
        top: "85%",
        start: 0,
        end: 100,
        handleStyle: {
          color: "#475569",
        },
      },
    ],
    series: [
      {
        name: "BTCUSDT",
        type: "candlestick",
        data: candlestickData.values,
        animation: true,
        itemStyle: {
          borderColor: upColor, // Up candle border
          borderColor0: downColor, // Down candle border
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#00da3c88" },
            { offset: 1, color: "#00da3c" },
          ]),
          color0: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#ec000088" },
            { offset: 1, color: "#ec0000" },
          ]),
        },
      },

      ...renderIndicatorSeries(indicatorsData, OHLCVData),
    ],
  };

  mainChart.setOption(option, true);

  setTimeout(() => {
    mainChart.setOption({
      series: [
        {
          animation: false,
          animationDuration: 0,
          animationDurationUpdate: 0,
        },
      ],
    });
  }, 1100);
}

// Initialize everything when the DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  const { marketData, plots: indicatorsData } = await loadIndicatorData();

  // Sort marketData by time
  //marketData.sort((a, b) => a.openTime - b.openTime);

  // Format candlestick data with timestamps in string format for category axis
  const OHLCVData = marketData.map((k) => [
    //new Date(k.openTime).toLocaleString(), // timestamp
    k.openTime,
    k.open,
    k.high,
    k.close,
    k.low,
    k.volume,
  ]);
  initializeCharts(OHLCVData, indicatorsData);
});

// Add resize handler at the bottom
window.addEventListener("resize", () => {
  if (mainChart) {
    // Add debounce to prevent excessive resizing
    clearTimeout(window.resizingTimer);
    window.resizingTimer = setTimeout(() => {
      mainChart.resize();
    }, 200);
  }
});
