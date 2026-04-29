"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  assets: number;
  liabilities: number;
  netWorth: number;
}

export function NetWorthBreakdown({ assets, liabilities, netWorth }: Props) {
  const data = [
    { name: 'Assets', value: assets, fill: 'var(--color-assets)' },
    { name: 'Liabilities', value: liabilities, fill: 'var(--color-liabilities)' },
    { name: 'Net Worth', value: netWorth, fill: 'var(--color-netWorth)' },
  ];

  return (
    <div className="w-full h-full" style={{
        '--color-assets': 'hsl(var(--chart-1))',
        '--color-liabilities': 'hsl(var(--destructive))',
        '--color-netWorth': 'hsl(var(--chart-2))',
    } as React.CSSProperties}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value) => `₹${Number(value).toLocaleString('en-IN', { notation: 'compact', compactDisplay: 'short' })}`} 
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
