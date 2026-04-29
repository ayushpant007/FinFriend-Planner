
"use client";

import type { FactsheetData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface FactsheetDisplayProps {
  data: FactsheetData;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'
];

export function FactsheetDisplay({ data }: FactsheetDisplayProps) {
  const sortedAllocations = [...data.industryAllocation].sort((a, b) => b.weight - a.weight);
  const top10 = sortedAllocations.slice(0, 10);
  const others = sortedAllocations.slice(10);
  
  let processedAllocations = top10;

  if (others.length > 0) {
    const othersWeight = others.reduce((acc, curr) => acc + curr.weight, 0);
    processedAllocations.push({ sector: 'Others', weight: othersWeight });
  }


  const industryData = processedAllocations.map((item, index) => ({
    name: item.sector,
    value: item.weight,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <div className="space-y-4">
      <Card className="bg-accent/10">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Industry Allocation (% of Net Assets)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={industryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {industryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="hsl(var(--accent) / 0.1)" />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Weight']} 
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-sm">
             <div className="grid grid-cols-2 gap-2">
                {industryData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: item.fill }}/>
                        <span className="truncate" title={item.name}>{item.name}</span>
                        <span className="ml-auto font-semibold">{item.value.toFixed(2)}%</span>
                    </div>
                ))}
             </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-accent/10">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Top Portfolio Holdings</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Weight (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.portfolioHoldings.map((holding) => (
                <TableRow key={holding.stock}>
                  <TableCell className="font-medium">{holding.stock}</TableCell>
                  <TableCell className="text-right">{holding.weight.toFixed(2)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="text-center text-md font-bold">Net Assets: {data.netAssets}</div>
    </div>
  );
}
