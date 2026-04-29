
"use client"

import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts';

interface AssetAllocationChartProps {
    assets: {
        name: string;
        value: number;
        color: string;
    }[];
    isReport?: boolean;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function AssetAllocationChart({ assets, isReport }: AssetAllocationChartProps) {
  if (assets.length === 0) {
    return (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No liquid asset data to display.
        </div>
    )
  }
  
  const chartData = assets.map((asset, index) => ({
      name: asset.name,
      value: asset.value,
      color: asset.color || COLORS[index % COLORS.length]
  }));

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };


  return (
    <div className="w-full h-full">
        {isReport ? (
            <PieChart width={300} height={250}>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius="80%"
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    isAnimationActive={false}
                >
                    {chartData.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            stroke={'hsl(var(--background))'}
                            strokeWidth={2}
                            className="focus:outline-none" 
                        />
                    ))}
                </Pie>
            </PieChart>
        ) : (
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius="80%"
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        isAnimationActive={false}
                    >
                        {chartData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color}
                                stroke={'hsl(var(--background))'}
                                strokeWidth={2}
                                className="focus:outline-none" 
                            />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        )}
    </div>
  );
}
