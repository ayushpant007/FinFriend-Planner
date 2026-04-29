'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Lock, FileText, Loader2, AlertCircle, TrendingUp, Briefcase, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function CasReportUpload() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        toast({
          title: 'PDF uploaded successfully',
          description: `File: ${droppedFile.name}`,
        });
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a PDF file',
          variant: 'destructive',
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        toast({
          title: 'PDF uploaded successfully',
          description: `File: ${selectedFile.name}`,
        });
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a PDF file',
          variant: 'destructive',
        });
      }
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please upload a PDF file first',
        variant: 'destructive',
      });
      return;
    }

    if (!password) {
      toast({
        title: 'Password required',
        description: 'Please enter the portfolio password (or spacebar for passwordless PDFs)',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('Starting CAS analysis...', { fileName: file.name, passwordLength: password.length });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', password);

      console.log('Sending request to /api/analyze-cas');

      const response = await fetch('/api/analyze-cas', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);

      const result = await response.json();
      console.log('Response data:', result);

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to analyze CAS');
      }

      toast({
        title: 'Portfolio analyzed successfully!',
        description: `Report ID: ${result.reportId}. Navigating to results...`,
      });

      // Navigate to results page
      setTimeout(() => {
        router.push(`/cas-report/results?id=${result.reportId}`);
      }, 500);
      
    } catch (error: any) {
      console.error('CAS Analysis Error:', error);
      toast({
        title: 'Analysis failed',
        description: error.message || 'Unable to analyze the PDF. Please check the password and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl">Upload Your Portfolio</CardTitle>
          <CardDescription className="text-base">
            Upload your CAS (Consolidated Account Statement) PDF to analyze your investments
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleAnalyze} className="space-y-6">
          {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFileDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/20'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-3">
              {file ? (
                <>
                  <FileText className="h-12 w-12 text-green-600" />
                  <div>
                    <p className="font-semibold text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Change File
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-foreground">Drag & drop your PDF here</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      or click to browse your files
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supported format: PDF
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Portfolio Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Enter password (PAN, DOB, or press spacebar for passwordless PDFs)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isAnalyzing}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground mt-2">
              💡 Tip: Most PDFs use your PAN (Permanent Account Number) or Date of Birth as password. 
              For some PDFs, just press spacebar if it's passwordless.
            </p>
          </div>

          {/* What Gets Analyzed Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              What Gets Analyzed
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Fund List */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 dark:to-purple-950/10 border border-purple-200/50 dark:border-purple-800/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Your Fund List</p>
                    <ul className="text-xs text-purple-800 dark:text-purple-200 space-y-1">
                      <li>✓ All funds you own</li>
                      <li>✓ Fund names & types</li>
                      <li>✓ Fund house details</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Holdings Details */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/10 border border-blue-200/50 dark:border-blue-800/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Holdings Details</p>
                    <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                      <li>✓ Units owned per fund</li>
                      <li>✓ NAV (per unit)</li>
                      <li>✓ Current value</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Investment Profile */}
              <div className="bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-950/10 border border-green-200/50 dark:border-green-800/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-green-900 dark:text-green-100 mb-2">Investment Profile</p>
                    <ul className="text-xs text-green-800 dark:text-green-200 space-y-1">
                      <li>✓ Total portfolio value</li>
                      <li>✓ Diversification</li>
                      <li>✓ Purchase dates</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-1">How It Works</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Your PDF is encrypted for security</li>
                  <li>We analyze your investments and portfolio composition</li>
                  <li>Your data is processed securely and never stored</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            type="submit"
            disabled={!file || isAnalyzing}
            size="lg"
            className="w-full text-base"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analyzing Portfolio...
              </>
            ) : (
              'Analyze Portfolio'
            )}
          </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            🔒 Your data is encrypted and processed securely
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
