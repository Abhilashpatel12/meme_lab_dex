import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, CandlestickSeries } from 'lightweight-charts';

export const TradingChart = ({ price }: { price?: number }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94A3B8',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.2)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.2)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
    });

    // 2. Add Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#4ADE80',         // Toxic Green
      downColor: '#A855F7',       // Electric Purple
      borderUpColor: '#4ADE80',
      borderDownColor: '#A855F7',
      wickUpColor: '#4ADE80',
      wickDownColor: '#A855F7',
    });

    // Increase price axis precision so very small prices don't round to 0.00
    try {
      candleSeries.applyOptions({
        priceFormat: { type: 'price', precision: 8, minMove: 0.00000001 }
      });
    } catch (e) {
      // ignore if applyOptions not supported in runtime environment
    }

    // 3. BUILD DATA FROM PROVIDED `price` PROP
    // Synchronous generation: create 100 points with tiny jitter around the
    // provided `price`. If `price` is falsy, build a small deterministic
    // fallback series so the chart renders predictably.
    try {
      const now = Math.floor(Date.now() / 1000);
      if (price) {
        const points = 100;
        const series: any[] = [];
        for (let i = points - 1; i >= 0; i--) {
          const t = now - i * 60; // per-minute granularity
          // tiny relative jitter (~0.2%) around provided price
          const mid = price * (1 + (Math.random() - 0.5) * 0.002);
          series.push({
            time: t,
            open: mid * 0.997,
            high: mid * 1.003,
            low: mid * 0.995,
            close: mid,
          });
        }
        candleSeries.setData(series);
      } else {
        // Deterministic fallback: small 10-point series with slight trend
        const fallback: any[] = [];
        const base = 0.000035;
        const points = 10;
        for (let i = 0; i < points; i++) {
          const t = now - (points - i) * 60;
          const factor = 1 + (i - points / 2) / (points * 1000); // tiny deterministic variation
          const mid = base * factor;
          const open = mid * 0.998;
          const close = mid * 1.001;
          const high = Math.max(open, close) * 1.0015;
          const low = Math.min(open, close) * 0.9995;
          fallback.push({ time: t, open, high, low, close });
        }
        candleSeries.setData(fallback);
      }
    } catch (err) {
      // If anything unexpected happens, set an empty series so chart stays empty
      candleSeries.setData([]);
    }

    // 4. Resize Handler
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [price]);

  return (
    <div className="w-full h-full p-4 bg-lab-card/20">
      <div ref={chartContainerRef} className="w-full h-full rounded-xl overflow-hidden" />
    </div>
  );
};