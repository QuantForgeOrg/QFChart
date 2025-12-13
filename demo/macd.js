async function macd(tickerId, timeframe = "1w", periods = 500, stime, etime) {
  const pineTS = new PineTS(
    PineTS.Provider.Binance,
    tickerId,
    timeframe,
    periods,
    stime,
    etime
  );

  const { result, plots, marketData } = await pineTS.run((context) => {
    /// fast_length = input(title = "Fast Length", defval = 12)
    let fast_length = input.int({ title: "Fast Length", defval: 12 });
    /// slow_length = input(title = "Slow Length", defval = 26)
    let slow_length = input.int({ title: "Slow Length", defval: 26 });
    /// src = input(title = "Source", defval = close)
    let src = input({ title: "Source", defval: close });
    /// signal_length = input.int(title = "Signal Smoothing",  minval = 1, maxval = 50, defval = 9, display = display.data_window)
    let signal_length = input.int({ title: "Signal Smoothing", defval: 9 });
    /// sma_source = input.string(title = "Oscillator MA Type",  defval = "EMA", options = ["SMA", "EMA"], display = display.data_window)
    let sma_source = input.string({
      title: "Oscillator MA Type",
      defval: "EMA",
    });
    /// sma_signal = input.string(title = "Signal Line MA Type", defval = "EMA", options = ["SMA", "EMA"], display = display.data_window)
    let sma_signal = input.string({
      title: "Signal Line MA Type",
      defval: "EMA",
    });
    /// fast_ma = sma_source == "SMA" ? ta.sma(src, fast_length) : ta.ema(src, fast_length)
    let fast_ma =
      sma_source == "SMA" ? ta.sma(src, fast_length) : ta.ema(src, fast_length);
    /// slow_ma = sma_source == "SMA" ? ta.sma(src, slow_length) : ta.ema(src, slow_length)
    let slow_ma =
      sma_source == "SMA" ? ta.sma(src, slow_length) : ta.ema(src, slow_length);
    /// macd = fast_ma - slow_ma
    let macd = fast_ma - slow_ma;
    /// signal = sma_signal == "SMA" ? ta.sma(macd, signal_length) : ta.ema(macd, signal_length)
    let signal =
      sma_signal == "SMA"
        ? ta.sma(macd, signal_length)
        : ta.ema(macd, signal_length);
    /// hist = macd - signal
    let hist = macd - signal;
    /// alertcondition(hist[1] >= 0 and hist < 0, title = 'Rising to falling', message = 'The MACD histogram switched from a rising to falling state')
    //alertcondition(hist[1] >= 0 && hist < 0, {title: 'Rising to falling', message: 'The MACD histogram switched from a rising to falling state'});
    /// alertcondition(hist[1] <= 0 and hist > 0, title = 'Falling to rising', message = 'The MACD histogram switched from a falling to rising state')
    //alertcondition(hist[1] <= 0 && hist > 0, {title: 'Falling to rising', message: 'The MACD histogram switched from a falling to rising state'});
    /// hline(0, "Zero Line", color = color.new(#787B86, 50))
    //hline(0, 'Zero Line', {color: color.new('#787B86', 50)});
    /// plot(hist, title = "Histogram", style = plot.style_columns, color = (hist >= 0 ? (hist[1] < hist ? #26A69A : #B2DFDB) : (hist[1] < hist ? #FFCDD2 : #FF5252)))

    const histColor =
      hist >= 0
        ? hist[1] < hist
          ? "#26A69A"
          : "#B2DFDB"
        : hist[1] < hist
        ? "#FFCDD2"
        : "#FF5252";
    plot(hist, "Histogram", {
      title: "Histogram",
      style: "histogram",
      color: histColor,
    });
    /// plot(macd,   title = "MACD",   color = #2962FF)
    plot(macd, "MACD", { title: "MACD", color: "#2962FF" });
    /// plot(signal, title = "Signal", color = #FF6D00)
    plot(signal, "Signal", { title: "Signal", color: "#FF6D00" });

    //plot(val, 'Momentum', { color: bcolor, style: 'histogram', linewidth: 4 });
    //plot(0, 'Cross', { color: scolor, style: 'cross', linewidth: 2 });
  });

  return { result, plots, marketData };
}
