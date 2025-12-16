'use client';

import { createChart, ColorType, AreaSeries, UTCTimestamp } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';
import { useChartData } from '@/components/hooks/useChartData';

export const TokenChart = ({ mint }: { mint: string }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useChartData(mint);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#d1d5db',
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.1)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.1)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.1)',
        timeVisible: true,
      },
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#4ade80', // lab-green
      topColor: 'rgba(74, 222, 128, 0.4)',
      bottomColor: 'rgba(74, 222, 128, 0.0)',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 8,
        minMove: 0.00000001,
      },
    });

    if (data && data.length > 0) {
      // Ensure data is sorted by time and unique
      const sortedData = [...data].sort((a, b) => a.time - b.time);
      // Remove duplicates
      const uniqueData = sortedData.filter((item, index, self) =>
        index === self.findIndex((t) => t.time === item.time)
      );
      
      // Cast time to UTCTimestamp for lightweight-charts compatibility
      areaSeries.setData(uniqueData.map(d => ({ time: d.time as UTCTimestamp, value: d.value })));
    }

    chart.timeScale().fitContent();

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
  }, [data]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lab-green"></div>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};
