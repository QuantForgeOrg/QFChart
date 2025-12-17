// Data Loading Helper (Simulating what was in chart.js)
const DATA_LENGTH = 500;
async function getIndicatorData(inficatorCode, tickerId, timeframe = '1w', periods = 500, stime, etime) {
    const pineTS = new PineTS(PineTS.Provider.Binance, tickerId, timeframe, periods, stime, etime);
    const { result, plots, marketData } = await pineTS.run(inficatorCode);
    return { result, plots, marketData };
}
console.log('Getting indicator data...');

(async () => {
    const promises = [getIndicatorData(macdIndicator, 'BTCUSDT', 'W', DATA_LENGTH)];
    const results = await Promise.all(promises);

    const { marketData, plots: macdPlots } = results[1];

    // Map Market Data to QFChart OHLCV format
    // marketData is array of objects: { openTime, open, high, low, close, volume }
    const ohlcvData = marketData.map((k) => ({
        time: k.openTime,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
    }));

    // Initialize Chart
    const chartContainer = document.getElementById('main-chart');
    window.chart = new QFChart.QFChart(chartContainer, {
        title: 'BTC/USDT', // Custom title
        height: '700px',
        padding: 0.2,
        databox: {
            position: 'floating',
        },
        dataZoom: {
            visible: true,
            position: 'top',
            height: 6,
            start: 50,
            end: 100,

            zoomLock: false,
            moveOnMouseMove: true,
            // This prevents the grab cursor
            preventDefaultMouseMove: false,
        },
        layout: {
            mainPaneHeight: '60%',
            gap: 5,
        },
    });

    // Set Market Data
    chart.setMarketData(ohlcvData);

    // Set Indicators
    // Group plots into one indicator
    chart.addIndicator('MACD', macdPlots, {
        isOverlay: false,
        height: 16,
        titleColor: '#ff9900',
        controls: { collapse: true, maximize: true },
    });
})();
