
"use client";

import type { ReportData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { NetWorthBreakdown } from '../charts/NetWorthBreakdown';
import { ExpenseBreakdown } from '../charts/ExpenseBreakdown';
import { Button } from '../ui/button';
import { Printer, FileText, Wallet, PiggyBank, ShieldCheck, TrendingUp, Bot, CheckCircle, AlertTriangle, Download, Share2 } from 'lucide-react';
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
  
  const [reportGeneratedForData, setReportGeneratedForData] = useState<string>("");

  const generatePdf = async () => {
    const reportElement = document.getElementById('report-section');
    if (!reportElement) {
        throw new Error("Report element not found");
    }

    // Duplicate check
    const currentDataHash = JSON.stringify({ 
      name: data.personalDetails.name, 
      email: data.personalDetails.email,
      netWorth: data.netWorth
    });

    if (reportGeneratedForData === currentDataHash) {
        toast({
            title: "Report Already Generated",
            description: "A report for these details has already been generated.",
        });
        // We throw to prevent download, or we can just return a dummy
        return null; 
    }

    // Ensure we are at the top for clean capture
    window.scrollTo(0, 0);
    await new Promise(resolve => setTimeout(resolve, 800));

    const pdf = new jsPDF('p', 'mm', 'a4', true);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const marginMm = 5;
    const usableWidth = pdfWidth - (marginMm * 2);
    const usableHeight = pdfHeight - (marginMm * 2);

    // Find all main cards/sections
    const sections = Array.from(reportElement.querySelectorAll('.rounded-xl, .shadow-md, .shadow-lg')) as HTMLElement[];
    
    let currentY_Mm = marginMm;
    let isFirstPage = true;

    for (const section of sections) {
        const canvas = await html2canvas(section, { 
            scale: 2, 
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#FFFFFF'
        });

        const imgWidth = usableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (!isFirstPage && (currentY_Mm + imgHeight > usableHeight)) {
            pdf.addPage();
            currentY_Mm = marginMm;
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', marginMm, currentY_Mm, imgWidth, imgHeight, undefined, 'FAST');
        
        currentY_Mm += imgHeight + 2; // Add 2mm spacing
        isFirstPage = false;
    }
    
    setReportGeneratedForData(currentDataHash);
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
                              <TableHead>Years</TableHead>
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
