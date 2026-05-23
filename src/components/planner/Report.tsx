
"use client";

import type { ReportData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { NetWorthBreakdown } from '../charts/NetWorthBreakdown';
import { ExpenseBreakdown } from '../charts/ExpenseBreakdown';
import { Button } from '../ui/button';
import { Printer, FileText, Wallet, PiggyBank, ShieldCheck, TrendingUp, Bot, CheckCircle, AlertTriangle, Download, Share2, Info } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  data: ReportData;
}

const StatCard = ({ title, value, icon, subValue }: { title: string; value: string; icon: React.ReactNode; subValue?: string }) => (
    <Card className="bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </CardContent>
    </Card>
);


export function Report({ data }: Props) {
  const yearlyCashflow = data.monthlyCashflow * 12;
  const { toast } = useToast();

  const generatePdf = async () => {
    const reportElement = document.getElementById('report-section');
    if (!reportElement) {
        throw new Error("Report element not found");
    }

    // Ensure we are at the top for clean capture
    window.scrollTo(0, 0);
    await new Promise(resolve => setTimeout(resolve, 800));

    const canvas = await html2canvas(reportElement, { 
        scale: 2, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        onclone: (clonedDoc) => {
            const el = clonedDoc.getElementById('report-section');
            if (el) {
                el.style.width = '800px';
                el.style.margin = '0';
                el.style.padding = '20px';
                el.style.transform = 'none';
                el.style.height = 'auto';
                el.style.overflow = 'visible';
                
                // Ensure all cards are visible
                el.querySelectorAll('.card').forEach(c => {
                    (c as HTMLElement).style.overflow = 'visible';
                });
                
                // Force recharts SVGs to fill their containers for ResponsiveContainer charts
                el.querySelectorAll('.recharts-responsive-container').forEach(c => {
                    (c as HTMLElement).style.width = '100%';
                    (c as HTMLElement).style.minWidth = '0';
                });
                el.querySelectorAll('.recharts-wrapper').forEach(c => {
                    const wrapper = c as HTMLElement;
                    const parentWidth = wrapper.parentElement?.getBoundingClientRect().width || 760;
                    wrapper.style.width = `${parentWidth}px`;
                });
                el.querySelectorAll('.recharts-surface').forEach(c => {
                    const svg = c as SVGElement;
                    const parentWidth = (svg.parentElement?.getBoundingClientRect().width || 760);
                    svg.setAttribute('width', String(parentWidth));
                    svg.style.width = `${parentWidth}px`;
                });
            }
        }
    });

    const imgWidth = 210; // Keep A4 width
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [imgWidth, imgHeight],
        compress: true
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    
    return pdf;
  }


  const handleDownload = async () => {
    try {
      const pdf = await generatePdf();
      if (pdf) {
        pdf.save(`${data.personalDetails.name.replace(/\s+/g, '_')}-detailed-report.pdf`);
      }
    } catch(e) {
      console.error("Failed to download PDF", e);
      alert("There was an error generating the PDF for download.");
    }
  };

  const handleShare = async () => {
    try {
      const pdf = await generatePdf();
      if (!pdf) return;
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `${data.personalDetails.name}-financial-report.pdf`, {
        type: 'application/pdf',
      });
      
      if (navigator.share) {
        await navigator.share({
          files: [pdfFile],
          title: 'Financial Wellness Report',
          text: `Here is the financial wellness report for ${data.personalDetails.name}.`,
        });
      } else {
        alert('Web Share API is not supported in your browser. Try downloading the report instead.');
      }
    } catch(e) {
       console.error("Failed to share PDF", e);
       alert("There was an error generating the PDF for sharing.");
    }
  }


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h2 className="text-3xl font-bold font-headline text-primary flex items-center gap-3">
            <FileText className="h-8 w-8" />
            <span>Financial Wellness Report</span>
          </h2>
          <p className="text-muted-foreground">
            A complete overview of your financial health for <span className="font-semibold text-foreground">{data.personalDetails.name}</span>.
          </p>
        </div>
         <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline"><Download className="mr-2 h-4 w-4"/>Download PDF</Button>
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && <Button onClick={handleShare}><Share2 className="mr-2 h-4 w-4" />Share</Button>}
        </div>
      </div>
      
      <div id="report-section" className="p-6 border-2 border-dashed rounded-xl printable-area bg-card">
        
        {/* Allocation-Only Notice */}
        {(data as any).isAllocationOnly && (
          <div className="mb-8 p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 shadow-sm print:hidden flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-blue-900 leading-snug">Allocation-Only Mode Active</p>
              <p className="text-xs text-blue-700 mt-1 leading-normal">
                You generated this report directly from the **Fund Allocations** page without entering your Income, Expenses, Assets, or Liabilities.
                <br/>
                The detailed report below is a **dynamic preview** synthesized purely from your proposed mutual fund allocations (₹{data.netWorth.toLocaleString('en-IN')} Lumpsum and ₹{data.monthlyCashflow.toLocaleString('en-IN')}/month SIP). 
                To see your **real** Net Worth, Cashflow analysis, and personalized AI summary, please go back to the <Link href="/" className="font-bold underline hover:text-blue-900">Planner</Link> and fill in your full financial details!
              </p>
            </div>
          </div>
        )}

        {/* AI Summary */}
        <Card className="mb-8 bg-primary/5 border-primary/20 shadow-lg">
           <CardHeader>
            <CardTitle className="flex items-center gap-3 text-primary">
              <Bot className="h-6 w-6" />
              AI Financial Summary
            </CardTitle>
           </CardHeader>
           <CardContent>
             <p className="prose prose-blue dark:prose-invert max-w-none text-foreground/90">{data.aiSummary || 'AI summary is being generated...'}</p>
           </CardContent>
        </Card>

        {/* Key Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard 
                title="Net Worth"
                value={`₹${data.netWorth.toLocaleString('en-IN')}`}
                icon={<Wallet className="h-5 w-5"/>}
            />
             <StatCard 
                title="Yearly Cashflow"
                value={`₹${yearlyCashflow.toLocaleString('en-IN')}`}
                subValue="After all expenses"
                icon={<PiggyBank className="h-5 w-5"/>}
            />
             <StatCard 
                title="Total Insurance"
                value={`₹${data.totalInsuranceCover.toLocaleString('en-IN')}`}
                subValue={`Premium: ₹${data.totalInsurancePremium.toLocaleString('en-IN')}/yr`}
                icon={<ShieldCheck className="h-5 w-5"/>}
            />
            <StatCard 
                title="Goals"
                value={data.goals.length.toString()}
                subValue="Financial milestones tracked"
                icon={<TrendingUp className="h-5 w-5"/>}
            />
        </div>
          
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-3 space-y-8">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Asset & Liability Breakdown</CardTitle>
                        <CardDescription>A visual representation of your net worth.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80 -ml-4">
                       <NetWorthBreakdown assets={data.totalAssets} liabilities={data.totalLiabilities} netWorth={data.netWorth} />
                    </CardContent>
                </Card>
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Financial Goals & Projections</CardTitle>
                        <CardDescription>Your required investment path for each goal.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Goal</TableHead>
                              <TableHead>Target (Today)</TableHead>
                              <TableHead>Years to Goal</TableHead>
                              <TableHead className="text-right">Required SIP</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.goals.map(goal => (
                              <TableRow key={goal.id}>
                                <TableCell className="font-medium">{goal.name}</TableCell>
                                <TableCell>₹{Number(goal.corpus).toLocaleString('en-IN')}</TableCell>
                                <TableCell>{goal.years}</TableCell>
                                <TableCell className="text-right font-bold text-primary">₹{goal.sip.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Estate Planning</CardTitle>
                        <CardDescription>Status of your will.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.willStatus === 'yes' ? (
                            <div className="flex items-center gap-3 text-green-700 dark:text-green-300">
                                <CheckCircle className="h-6 w-6" />
                                <div>
                                    <p className="font-semibold">Will prepared.</p>
                                    <p className="text-sm">Your estate planning is in order.</p>
                                </div>
                            </div>
                        ) : data.willStatus === 'no' ? (
                             <div className="flex items-start gap-3 text-orange-700 dark:text-orange-300">
                                <AlertTriangle className="h-6 w-6 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-semibold">Estate planning is pending.</p>
                                    <p className="text-sm">We recommend creating a will to ensure your assets are distributed as you wish.</p>
                                </div>
                            </div>
                        ) : (
                             <div className="flex items-center gap-3 text-muted-foreground">
                                <p>No information provided on estate planning.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            {/* Right Column */}
            <div className="lg:col-span-2 space-y-8">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Annual Expense Breakdown</CardTitle>
                        <CardDescription>Where your money is going each year.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ExpenseBreakdown expenses={data.expenses} />
                    </CardContent>
                </Card>
            </div>
        </div>

      </div>
    </div>
  );
}
