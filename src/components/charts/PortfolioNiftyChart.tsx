"use client";

import { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, ComposedChart, Bar, BarChart, ReferenceLine, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';

interface Props {
  data: {
    date: string;
    benchmark?: number;
    modelPortfolio?: number;
  }[];
  title: string;
  isReport?: boolean;
}

const COLORS = {
  portfolio: '#0D9488',
  benchmark: '#6B7280',
  positive: '#10B981',
  negative: '#EF4444',
  positiveLight: 'rgba(16, 185, 129, 0.15)',
  negativeLight: 'rgba(239, 68, 68, 0.15)',
};

interface MetricCardProps {
  label: string;
  value: string;
  isPositive: boolean;
  icon: React.ReactNode;
  subLabel?: string;
}

function MetricCard({ label, value, isPositive, icon, subLabel }: MetricCardProps) {
  return (
    <div className="flex flex-col items-center p-4 rounded-xl border bg-card shadow-sm min-w-[140px]">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold font-mono ${
        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      }`}>
        {value}
      </div>
      {subLabel && (
        <div className="text-xs text-muted-foreground mt-1">{subLabel}</div>
      )}
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function EnhancedTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const portfolioValue = payload.find((p: any) => p.dataKey === 'modelPortfolio')?.value;
  const benchmarkValue = payload.find((p: any) => p.dataKey === 'benchmark')?.value;
  const portfolioGain = portfolioValue ? portfolioValue - 100 : null;
  const benchmarkGain = benchmarkValue ? benchmarkValue - 100 : null;
  const alpha = portfolioGain !== null && benchmarkGain !== null ? portfolioGain - benchmarkGain : null;
  const date = payload[0]?.payload?.date;

  return (
    <div className="rounded-xl border-2 bg-white dark:bg-gray-900 p-4 shadow-2xl min-w-[240px]">
      <div className="text-base font-bold text-foreground mb-3 pb-2 border-b border-border">
        {date}
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS.portfolio }} />
            <span className="text-sm text-muted-foreground">Your Portfolio:</span>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-foreground">₹{portfolioValue?.toFixed(2)}</span>
            {portfolioGain !== null && (
              <span className={`text-xs ml-1 font-medium ${portfolioGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ({portfolioGain >= 0 ? '+' : ''}{portfolioGain.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS.benchmark }} />
            <span className="text-sm text-muted-foreground">Benchmark:</span>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-foreground">₹{benchmarkValue?.toFixed(2)}</span>
            {benchmarkGain !== null && (
              <span className={`text-xs ml-1 font-medium ${benchmarkGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ({benchmarkGain >= 0 ? '+' : ''}{benchmarkGain.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
        
        {alpha !== null && (
          <div className="pt-2 mt-2 border-t-2 border-dashed border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Alpha:</span>
              <span className={`font-mono font-bold text-lg ${
                alpha >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VarianceTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const variance = payload[0]?.value;
  const date = payload[0]?.payload?.date;

  return (
    <div className="rounded-lg border bg-white dark:bg-gray-900 p-3 shadow-xl min-w-[160px]">
      <div className="text-sm font-bold text-foreground mb-2">{date}</div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Monthly Variance:</span>
        <span className={`font-mono font-bold ${
          variance >= 0 ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {variance >= 0 ? '+' : ''}{variance?.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function CustomLegend({ payload }: { payload?: any[] }) {
  if (!payload) return null;

  const formatName = (name: string) => {
    if (name === 'benchmark') return 'Weighted Benchmark';
    if (name === 'modelPortfolio') return 'Your Portfolio';
    return name;
  };

  return (
    <div className="flex items-center justify-center gap-8 text-sm mt-4">
      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center gap-2">
          <div 
            className="h-3 w-3 rounded-full" 
            style={{ backgroundColor: entry.dataKey === 'modelPortfolio' ? COLORS.portfolio : COLORS.benchmark }} 
          />
          <span className="font-medium text-foreground">{formatName(entry.dataKey)}</span>
        </div>
      ))}
    </div>
  );
}

export function PortfolioNiftyChart({ data, title, isReport }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Not enough data to display the chart.
      </div>
    );
  }

  const isGrowthChart = data.length > 5;

  const chartData = useMemo(() => {
    return data.map((point, index) => {
      const portfolio = point.modelPortfolio ?? 100;
      const benchmark = point.benchmark ?? 100;
      const variance = portfolio - benchmark;
      
      return {
        ...point,
        variance,
        ribbonTop: Math.max(portfolio, benchmark),
        ribbonBottom: Math.min(portfolio, benchmark),
        isOutperforming: portfolio >= benchmark,
      };
    });
  }, [data]);

  const { minValue, maxValue, yAxisMin, yAxisMax } = useMemo(() => {
    const allValues = data.flatMap(d => [d.modelPortfolio ?? 100, d.benchmark ?? 100]);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min;
    const padding = range * 0.05;
    
    return {
      minValue: min,
      maxValue: max,
      yAxisMin: Math.floor(min - padding),
      yAxisMax: Math.ceil(max + padding),
    };
  }, [data]);

  const metrics = useMemo(() => {
    const firstPortfolio = data[0]?.modelPortfolio ?? 100;
    const firstBenchmark = data[0]?.benchmark ?? 100;
    const lastPortfolio = data[data.length - 1]?.modelPortfolio ?? 100;
    const lastBenchmark = data[data.length - 1]?.benchmark ?? 100;
    
    const portfolioReturn = ((lastPortfolio - firstPortfolio) / firstPortfolio) * 100;
    const benchmarkReturn = ((lastBenchmark - firstBenchmark) / firstBenchmark) * 100;
    const alpha = portfolioReturn - benchmarkReturn;
    
    return { portfolioReturn, benchmarkReturn, alpha };
  }, [data]);

  if (isGrowthChart) {
    return (
      <Card className="mt-6 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Growth of ₹100 investment rebased to show cumulative performance
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-start">
              <MetricCard
                label="Portfolio Return"
                value={`${metrics.portfolioReturn >= 0 ? '+' : ''}${metrics.portfolioReturn.toFixed(1)}%`}
                isPositive={metrics.portfolioReturn >= 0}
                icon={<TrendingUp className="h-3.5 w-3.5" />}
              />
              <MetricCard
                label="Benchmark Return"
                value={`${metrics.benchmarkReturn >= 0 ? '+' : ''}${metrics.benchmarkReturn.toFixed(1)}%`}
                isPositive={metrics.benchmarkReturn >= 0}
                icon={<Target className="h-3.5 w-3.5" />}
              />
              <MetricCard
                label="Alpha Generated"
                value={`${metrics.alpha >= 0 ? '+' : ''}${metrics.alpha.toFixed(1)}%`}
                isPositive={metrics.alpha >= 0}
                icon={metrics.alpha >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                subLabel={metrics.alpha >= 0 ? "Outperformance" : "Underperformance"}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <div className="h-[400px] w-full">
            {isReport ? (
              <ComposedChart
                width={700}
                height={400}
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.positive} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.positive} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.negative} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.negative} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.portfolio} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={COLORS.portfolio} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border) / 0.5)" 
                  vertical={false} 
                />
                
                <XAxis
                  dataKey="date"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={60}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[yAxisMin, yAxisMax]}
                  tickFormatter={(value) => `₹${value.toFixed(0)}`}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={60}
                />
                
                <Tooltip content={<EnhancedTooltip />} />
                
                <Area
                  type="monotone"
                  dataKey="modelPortfolio"
                  stroke="none"
                  fill="url(#portfolioGradient)"
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  stroke={COLORS.benchmark}
                  name="Weighted Benchmark"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 5, stroke: COLORS.benchmark, strokeWidth: 2, fill: 'white' }}
                  isAnimationActive={false}
                />
                
                <Line
                  type="monotone"
                  dataKey="modelPortfolio"
                  stroke={COLORS.portfolio}
                  name="Your Portfolio"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, stroke: COLORS.portfolio, strokeWidth: 2, fill: 'white' }}
                  isAnimationActive={false}
                />
                
                <Legend content={<CustomLegend />} verticalAlign="bottom" />
              </ComposedChart>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.positive} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COLORS.positive} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.negative} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COLORS.negative} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.portfolio} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={COLORS.portfolio} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border) / 0.5)" 
                    vertical={false} 
                  />
                  
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={60}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[yAxisMin, yAxisMax]}
                    tickFormatter={(value) => `₹${value.toFixed(0)}`}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={60}
                  />
                  
                  <Tooltip content={<EnhancedTooltip />} />
                  
                  <Area
                    type="monotone"
                    dataKey="modelPortfolio"
                    stroke="none"
                    fill="url(#portfolioGradient)"
                    fillOpacity={1}
                  />
                  
                  <Line
                    type="monotone"
                    dataKey="benchmark"
                    stroke={COLORS.benchmark}
                    name="Weighted Benchmark"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 5, stroke: COLORS.benchmark, strokeWidth: 2, fill: 'white' }}
                  />
                  
                  <Line
                    type="monotone"
                    dataKey="modelPortfolio"
                    stroke={COLORS.portfolio}
                    name="Your Portfolio"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, stroke: COLORS.portfolio, strokeWidth: 2, fill: 'white' }}
                  />
                  
                  <Legend content={<CustomLegend />} verticalAlign="bottom" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Monthly Alpha Variance</span>
            </div>
            <div className="h-[100px] w-full">
              {isReport ? (
                <BarChart
                  width={700}
                  height={100}
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={80}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `${value > 0 ? '+' : ''}${value.toFixed(0)}`}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={40}
                  />
                  <Tooltip content={<VarianceTooltip />} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                  <Bar dataKey="variance" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.variance >= 0 ? COLORS.positive : COLORS.negative}
                        fillOpacity={0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={80}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `${value > 0 ? '+' : ''}${value.toFixed(0)}`}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      width={40}
                    />
                    <Tooltip content={<VarianceTooltip />} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                    <Bar dataKey="variance" radius={[2, 2, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.variance >= 0 ? COLORS.positive : COLORS.negative}
                          fillOpacity={0.7}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const alphaValues = data.map((point) => ({
    date: point.date,
    alpha: (point.modelPortfolio ?? 0) - (point.benchmark ?? 0),
  }));

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Weighted Average CAGR Comparison (3-Year, 5-Year, 10-Year Returns)
            </p>
          </div>
          <div className="flex gap-4 flex-wrap">
            {alphaValues.map((item, idx) => {
              const isPositive = item.alpha >= 0;
              return (
                <div key={idx} className="text-right">
                  <p className="text-xs text-muted-foreground font-medium mb-1">{item.date}</p>
                  <div className={`text-sm font-bold font-mono px-2 py-1 rounded ${
                    isPositive 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    <span className="text-xs">Alpha </span>
                    {isPositive ? '+' : ''}{item.alpha.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-96 w-full">
        {isReport ? (
          <LineChart
            width={700}
            height={384}
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
            <XAxis
              dataKey="date"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              label={{ value: 'CAGR %', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<EnhancedTooltip />} />
            <Legend content={<CustomLegend />} verticalAlign="bottom" />
            <Line
              type="monotone"
              dataKey="modelPortfolio"
              stroke={COLORS.portfolio}
              name="Your Portfolio"
              strokeWidth={3}
              dot={{ fill: COLORS.portfolio, r: 6 }}
              activeDot={{ r: 8 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke={COLORS.benchmark}
              name="Weighted Benchmark"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: COLORS.benchmark, r: 6 }}
              activeDot={{ r: 8 }}
              isAnimationActive={false}
            />
          </LineChart>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
              <XAxis
                dataKey="date"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                label={{ value: 'CAGR %', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<EnhancedTooltip />} />
              <Legend content={<CustomLegend />} verticalAlign="bottom" />
              <Line
                type="monotone"
                dataKey="modelPortfolio"
                stroke={COLORS.portfolio}
                name="Your Portfolio"
                strokeWidth={3}
                dot={{ fill: COLORS.portfolio, r: 6 }}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke={COLORS.benchmark}
                name="Weighted Benchmark"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: COLORS.benchmark, r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
