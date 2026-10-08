import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area
} from 'recharts';
import type { WeatherForecast } from '../types';
import { 
  DropletIcon, 
  SproutIcon, 
  SunIcon, 
  RainIcon, 
  WindIcon, 
  BarChartIcon,
  TrendingUpIcon,
  CheckCircleIcon
} from './common/icons';

interface WeatherTrendChartProps {
  forecasts: WeatherForecast[];
  regionName?: string;
}

export const WeatherTrendChart: React.FC<WeatherTrendChartProps> = ({ forecasts, regionName }) => {
  const [viewMode, setViewMode] = useState<'combined' | 'temperature' | 'rainfall'>('combined');
  const [activeCropGuide, setActiveCropGuide] = useState<'Maize' | 'Cassava' | 'Vegetables' | 'Cocoa'>('Maize');

  if (!forecasts || forecasts.length === 0) {
    return null;
  }

  // Transform forecasts into recharts consumable format
  const chartData = forecasts.map((f, idx) => {
    const rainfall = f.rainfall_mm ?? (f.condition === 'Stormy' ? 26 : f.condition === 'Rainy' ? 14 : f.condition === 'Cloudy' ? 3 : 0);
    const tempAvg = f.temp;
    const tempMax = f.temp_max ?? (tempAvg + 2);
    const tempMin = f.temp_min ?? (tempAvg - 5);
    const precipProb = f.precipitation_probability ?? (rainfall > 15 ? 85 : rainfall > 5 ? 60 : rainfall > 0 ? 30 : 10);

    return {
      day: f.day,
      date: f.date || `Day ${idx + 1}`,
      condition: f.condition,
      temp: tempAvg,
      tempMax,
      tempMin,
      rainfall,
      precipProb,
      wind: f.wind,
      humidity: parseInt(f.humidity) || 65,
      agromet_note: f.agromet_note,
      planting_suitability: f.planting_suitability || (
        rainfall >= 10 && rainfall <= 35 ? 'Good for Sowing' :
        rainfall === 0 && f.wind < 15 ? 'Good for Spraying' :
        rainfall > 35 ? 'Unfavorable' : 'Optimal'
      )
    };
  });

  // Calculate weekly metrics for Ghanaian farming
  const totalRainfall = chartData.reduce((acc, curr) => acc + curr.rainfall, 0);
  const avgTemp = Math.round(chartData.reduce((acc, curr) => acc + curr.temp, 0) / chartData.length);
  const rainyDaysCount = chartData.filter(d => d.rainfall >= 5).length;
  const optimalSowingDays = chartData.filter(d => d.planting_suitability === 'Good for Sowing' || (d.rainfall >= 8 && d.rainfall <= 30));
  const optimalSprayingDays = chartData.filter(d => d.rainfall === 0 && d.wind < 15);

  // Agronomic guidance based on 7-day cumulative rainfall
  const getSowingAdvice = () => {
    if (totalRainfall > 80) {
      return {
        verdict: 'Heavy Waterlogging Risk',
        color: 'bg-red-50 text-red-800 border-red-200',
        badge: 'Delay Sowing & Dig Furrows',
        advice: 'Cumulative weekly rainfall exceeds 80mm. Soil saturation is high. Delay planting seeds sensitive to rot (e.g. maize, cowpea). Ensure perimeter drainage channels are clear.'
      };
    } else if (totalRainfall >= 25 && rainyDaysCount >= 2) {
      return {
        verdict: 'Prime Sowing Window Active',
        color: 'bg-emerald-50 text-emerald-900 border-emerald-300',
        badge: 'Recommended for Planting',
        advice: 'Adequate consistent moisture across the next 7 days (25-80mm). Ideal soil conditions for germination of maize, beans, groundnuts, and transplanting pepper or tomato seedlings.'
      };
    } else if (totalRainfall >= 10) {
      return {
        verdict: 'Marginal Moisture for Sowing',
        color: 'bg-amber-50 text-amber-900 border-amber-300',
        badge: 'Sow with Supplemental Irrigation',
        advice: 'Moderate shower intervals. Suitable for drought-tolerant crops like cassava stem cuttings or sorghum, but shallow-rooted seeds will require supplementary watering if dry spells persist.'
      };
    } else {
      return {
        verdict: 'Dry Sowing Window - High Chemical Efficacy',
        color: 'bg-blue-50 text-blue-900 border-blue-200',
        badge: 'Foliar Spray & Tillage Friendly',
        advice: 'Dry conditions forecast (<10mm rain). Excellent window for land clearing, deep ploughing, sun-drying harvested grain, and applying protective fungicides/herbicides without rain wash-off.'
      };
    }
  };

  const advice = getSowingAdvice();

  // Custom Recharts Tooltip tailored for agricultural decisions
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs backdrop-blur-md max-w-xs">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
            <span className="font-bold text-sm text-amber-300">{label}</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-gray-300 font-mono">
              {data.condition}
            </span>
          </div>

          <div className="space-y-1.5 mb-2.5">
            <div className="flex justify-between items-center text-gray-200">
              <span className="text-gray-400">Temperature:</span>
              <span className="font-bold text-amber-400">
                {data.temp}°C <span className="text-gray-400 font-normal">({data.tempMin}° - {data.tempMax}°C)</span>
              </span>
            </div>

            <div className="flex justify-between items-center text-gray-200">
              <span className="text-gray-400">Expected Rainfall:</span>
              <span className="font-bold text-blue-400">
                {data.rainfall} mm <span className="text-blue-300 text-[10px]">({data.precipProb}% prob.)</span>
              </span>
            </div>

            <div className="flex justify-between items-center text-gray-200">
              <span className="text-gray-400">Wind / Humidity:</span>
              <span className="text-gray-300 font-mono">{data.wind} km/h • {data.humidity}%</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <div className="text-[11px] font-semibold text-emerald-400 mb-1 flex items-center gap-1">
              <SproutIcon className="w-3.5 h-3.5" /> {data.planting_suitability}
            </div>
            {data.agromet_note && (
              <p className="text-[11px] text-gray-300 italic leading-snug">
                "{data.agromet_note}"
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Chart Card Header */}
      <div className="p-4 sm:p-5 border-b border-gray-100 bg-gradient-to-r from-green-50/60 via-white to-blue-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-600 text-white rounded-lg shadow-xs">
                <TrendingUpIcon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                7-Day Agrometeorological Trend: Temperature & Rainfall
              </h3>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Empowering Ghanaian smallholders to schedule planting, soil preparation, fertilizer application, and spraying.
            </p>
          </div>

          {/* Toggle Views */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 self-start md:self-auto text-xs font-semibold">
            <button
              onClick={() => setViewMode('combined')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'combined'
                  ? 'bg-white text-green-800 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Combined Trend
            </button>
            <button
              onClick={() => setViewMode('rainfall')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'rainfall'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <DropletIcon className="w-3.5 h-3.5" /> Rainfall (mm)
            </button>
            <button
              onClick={() => setViewMode('temperature')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'temperature'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <SunIcon className="w-3.5 h-3.5" /> Temp (°C)
            </button>
          </div>
        </div>

        {/* 7-Day Quick Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <div className="bg-white/80 p-2.5 rounded-xl border border-gray-200">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">7-Day Rain Volume</span>
            <span className="text-base font-extrabold text-blue-700 flex items-baseline gap-1 mt-0.5">
              {totalRainfall} mm
              <span className="text-[11px] font-normal text-gray-500">cumulative</span>
            </span>
          </div>

          <div className="bg-white/80 p-2.5 rounded-xl border border-gray-200">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">Average Temp</span>
            <span className="text-base font-extrabold text-amber-700 flex items-baseline gap-1 mt-0.5">
              {avgTemp}°C
              <span className="text-[11px] font-normal text-gray-500">mean daily</span>
            </span>
          </div>

          <div className="bg-white/80 p-2.5 rounded-xl border border-gray-200">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">Sowing Windows</span>
            <span className="text-base font-extrabold text-emerald-700 flex items-baseline gap-1 mt-0.5">
              {optimalSowingDays.length} Days
              <span className="text-[11px] font-normal text-gray-500">moist soil</span>
            </span>
          </div>

          <div className="bg-white/80 p-2.5 rounded-xl border border-gray-200">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">Dry / Spray Windows</span>
            <span className="text-base font-extrabold text-teal-700 flex items-baseline gap-1 mt-0.5">
              {optimalSprayingDays.length} Days
              <span className="text-[11px] font-normal text-gray-500">low drift</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Section */}
      <div className="p-4 sm:p-5">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <defs>
                <linearGradient id="rainfallGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.85} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.25} />
                </linearGradient>
                <linearGradient id="tempAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis 
                dataKey="day" 
                tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: '#d1d5db' }}
              />

              {/* Left Axis: Temperature (°C) */}
              {(viewMode === 'combined' || viewMode === 'temperature') && (
                <YAxis 
                  yAxisId="tempAxis"
                  orientation="left"
                  domain={[18, 42]}
                  unit="°C"
                  tick={{ fill: '#d97706', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#f59e0b' }}
                />
              )}

              {/* Right Axis: Rainfall (mm) */}
              {(viewMode === 'combined' || viewMode === 'rainfall') && (
                <YAxis 
                  yAxisId="rainAxis"
                  orientation="right"
                  domain={[0, Math.max(40, ...chartData.map(d => d.rainfall + 5))]}
                  unit="mm"
                  tick={{ fill: '#2563eb', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#3b82f6' }}
                />
              )}

              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }} 
              />

              {/* Threshold Reference Lines for Agronomic Safety */}
              {viewMode !== 'temperature' && (
                <ReferenceLine 
                  yAxisId="rainAxis" 
                  y={10} 
                  stroke="#10b981" 
                  strokeDasharray="4 4" 
                  label={{ value: 'Planting Threshold (10mm)', position: 'insideBottomRight', fill: '#059669', fontSize: 10 }} 
                />
              )}

              {/* Rainfall Bar Column */}
              {(viewMode === 'combined' || viewMode === 'rainfall') && (
                <Bar 
                  yAxisId="rainAxis"
                  dataKey="rainfall" 
                  name="Rainfall (mm)" 
                  fill="url(#rainfallGradient)" 
                  radius={[6, 6, 0, 0]}
                  barSize={24}
                />
              )}

              {/* Temperature Line & Area */}
              {(viewMode === 'combined' || viewMode === 'temperature') && (
                <>
                  <Area
                    yAxisId="tempAxis"
                    type="monotone"
                    dataKey="temp"
                    fill="url(#tempAreaGradient)"
                    stroke="none"
                  />
                  <Line 
                    yAxisId="tempAxis"
                    type="monotone" 
                    dataKey="temp" 
                    name="Mean Temp (°C)" 
                    stroke="#d97706" 
                    strokeWidth={3}
                    dot={{ fill: '#d97706', r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 7, stroke: '#b45309', strokeWidth: 2 }}
                  />
                  <Line 
                    yAxisId="tempAxis"
                    type="monotone" 
                    dataKey="tempMax" 
                    name="Max Temp (°C)" 
                    stroke="#ef4444" 
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Dynamic Planting Decision Banner */}
        <div className={`mt-5 p-4 rounded-xl border ${advice.color} flex flex-col md:flex-row items-start md:items-center justify-between gap-3`}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-lg shadow-xs mt-0.5">
              <SproutIcon className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{advice.verdict}</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white shadow-xs border border-gray-200">
                  {advice.badge}
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {advice.advice}
              </p>
            </div>
          </div>
        </div>

        {/* 7-Day Day-by-Day Agronomic Scheduling Table */}
        <div className="mt-5 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <BarChartIcon className="w-4 h-4 text-green-700" />
              Day-by-Day Field Action Guide ({regionName || 'Selected Region'})
            </h4>
            
            {/* Quick Crop Filter */}
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-gray-500 font-medium">Crop Context:</span>
              {(['Maize', 'Cassava', 'Vegetables', 'Cocoa'] as const).map(crop => (
                <button
                  key={crop}
                  onClick={() => setActiveCropGuide(crop)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                    activeCropGuide === crop 
                      ? 'bg-green-700 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {crop}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
            {chartData.map((d, index) => {
              const isRainy = d.rainfall >= 5;
              const isHeavy = d.rainfall >= 20;

              return (
                <div 
                  key={index}
                  className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                    isHeavy 
                      ? 'bg-red-50/50 border-red-200' 
                      : isRainy 
                      ? 'bg-blue-50/50 border-blue-200' 
                      : 'bg-gray-50/70 border-gray-200'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-gray-900">{d.day}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isHeavy ? 'bg-red-200 text-red-800' :
                        isRainy ? 'bg-blue-200 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {d.temp}°C
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-700 font-medium my-1">
                      <DropletIcon className={`w-3.5 h-3.5 ${d.rainfall > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span>{d.rainfall} mm rain</span>
                    </div>

                    <div className="mt-1.5 text-[11px] font-bold text-gray-800">
                      {d.planting_suitability}
                    </div>
                  </div>

                  <p className="mt-2 text-[10px] text-gray-500 line-clamp-2 leading-tight">
                    {d.agromet_note || (
                      isRainy 
                        ? `Good soil moisture for ${activeCropGuide}. Avoid fertilizer leaching.` 
                        : `Dry canopy. Ideal for foliar weeding or scouting in ${activeCropGuide}.`
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
