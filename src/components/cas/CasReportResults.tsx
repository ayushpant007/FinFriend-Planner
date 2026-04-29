'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, Share2, Briefcase, TrendingUp, BarChart3, Calendar, DollarSign, Percent } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function CasReportResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reportId = searchParams.get('id') || '';
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Sample analyzed data structure
  const sampleReport = {
    reportId,
    analyzedAt: new Date().toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    totalPortfolioValue: 750000,
    totalInvested: 650000,
    gain: 100000,
    gainPercent: 15.38,
    fundCount: 8,
    diversification: {
      equity: 45,
      debt: 35,
      hybrid: 20
    },
    funds: [
      {
        id: 1,
        name: 'Aditya Birla Sun Life Equity Fund',
        folioNumber: 'ABSL-1234567890',
        units: 1250.50,
        nav: 150.25,
        currentValue: 187812.50,
        invested: 163500,
        gain: 24312.50,
        type: 'Equity',
        purchaseDate: '2021-03-15'
      },
      {
        id: 2,
        name: 'HDFC Banking and PSU Debt Fund',
        folioNumber: 'HDFC-0987654321',
        units: 890.75,
        nav: 28.45,
        currentValue: 25344.38,
        invested: 23500,
        gain: 1844.38,
        type: 'Debt',
        purchaseDate: '2021-06-20'
      },
      {
        id: 3,
        name: 'ICICI Prudential Balanced Advantage Fund',
        folioNumber: 'ICICI-5678901234',
        units: 625.00,
        nav: 175.50,
        currentValue: 109687.50,
        invested: 98750,
        gain: 10937.50,
        type: 'Hybrid',
        purchaseDate: '2020-12-10'
      },
      {
        id: 4,
        name: 'Motilal Oswal Focused 30 Fund',
        folioNumber: 'MOFSL-4567890123',
        units: 400.25,
        nav: 145.80,
        currentValue: 58337.07,
        invested: 55000,
        gain: 3337.07,
        type: 'Equity',
        purchaseDate: '2022-01-05'
      },
      {
        id: 5,
        name: 'Axis Liquid Fund',
        folioNumber: 'AXISBANK-9876543',
        units: 3500.00,
        nav: 2155.75,
        currentValue: 75451.25,
        invested: 71000,
        gain: 4451.25,
        type: 'Debt',
        purchaseDate: '2022-03-12'
      },
      {
        id: 6,
        name: 'SBI Bluechip Fund',
        folioNumber: 'SBI-2109876543',
        units: 780.30,
        nav: 118.50,
        currentValue: 92467.55,
        invested: 85000,
        gain: 7467.55,
        type: 'Equity',
        purchaseDate: '2021-08-22'
      },
      {
        id: 7,
        name: 'Franklin India High Growth Companies Fund',
        folioNumber: 'FIL-3456789012',
        units: 540.65,
        nav: 160.20,
        currentValue: 86643.13,
        invested: 82000,
        gain: 4643.13,
        type: 'Equity',
        purchaseDate: '2021-11-10'
      },
      {
        id: 8,
        name: 'Kotak Balanced Fund',
        folioNumber: 'KOTAKBANK-1234567',
        units: 950.40,
        nav: 85.35,
        currentValue: 81083.34,
        invested: 79000,
        gain: 2083.34,
        type: 'Hybrid',
        purchaseDate: '2022-02-14'
      }
    ]
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 p-4">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="outline"
            onClick={() => router.push('/cas-report')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Upload
          </Button>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Analyzing Your Portfolio</CardTitle>
              <CardDescription>Processing your CAS report...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Extracting fund data</span>
                  <span className="text-muted-foreground">35%</span>
                </div>
                <Progress value={35} className="h-2" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Calculating returns</span>
                  <span className="text-muted-foreground">65%</span>
                </div>
                <Progress value={65} className="h-2" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Generating insights</span>
                  <span className="text-muted-foreground">90%</span>
                </div>
                <Progress value={90} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/cas-report')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Upload Another
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{sampleReport.totalPortfolioValue.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">Current market value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Gain
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{sampleReport.gain.toLocaleString('en-IN')}</div>
              <p className="text-xs text-green-600 mt-1">+{sampleReport.gainPercent.toFixed(2)}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Funds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sampleReport.fundCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Mutual funds owned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Report ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-mono text-foreground truncate">{reportId}</p>
              <p className="text-xs text-muted-foreground mt-1">{sampleReport.analyzedAt}</p>
            </CardContent>
          </Card>
        </div>

        {/* Diversification */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Portfolio Diversification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Equity</span>
                  <span className="font-semibold">{sampleReport.diversification.equity}%</span>
                </div>
                <Progress value={sampleReport.diversification.equity} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Debt</span>
                  <span className="font-semibold">{sampleReport.diversification.debt}%</span>
                </div>
                <Progress value={sampleReport.diversification.debt} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Hybrid</span>
                  <span className="font-semibold">{sampleReport.diversification.hybrid}%</span>
                </div>
                <Progress value={sampleReport.diversification.hybrid} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Holdings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Holdings</CardTitle>
            <CardDescription>Detailed breakdown of your mutual fund investments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Fund Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Folio No.</th>
                    <th className="text-right py-3 px-4 font-semibold">Units</th>
                    <th className="text-right py-3 px-4 font-semibold">NAV</th>
                    <th className="text-right py-3 px-4 font-semibold">Current Value</th>
                    <th className="text-right py-3 px-4 font-semibold">Gain/Loss</th>
                    <th className="text-center py-3 px-4 font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleReport.funds.map((fund) => (
                    <tr key={fund.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-sm">{fund.name}</p>
                          <p className="text-xs text-muted-foreground">Since {new Date(fund.purchaseDate).toLocaleDateString('en-IN')}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-mono text-muted-foreground">{fund.folioNumber}</p>
                      </td>
                      <td className="text-right py-3 px-4">{fund.units.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="text-right py-3 px-4">₹{fund.nav.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 font-semibold">₹{fund.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="text-right py-3 px-4">
                        <span className="text-green-600 font-semibold">+₹{fund.gain.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge variant="outline" className="text-xs">{fund.type}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-900 dark:text-blue-100">
          <p className="font-semibold mb-2">Next Steps</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Review your portfolio composition and diversification</li>
            <li>Analyze returns compared to benchmarks</li>
            <li>Identify opportunities for rebalancing</li>
            <li>Consider tax-efficient investing strategies</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
