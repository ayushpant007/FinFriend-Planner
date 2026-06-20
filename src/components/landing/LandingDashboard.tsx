"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, Target, Shield, ArrowRight, Bell,
  Zap, Star, ChevronRight, BarChart3, Home,
  Menu, X, CheckCircle2, AlertCircle, Lightbulb,
  Activity, Wallet, DollarSign, PieChart as PieChartIcon, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';

const portfolioData = [
  { month: 'Apr', portfolio: 3820000, benchmark: 3640000 },
  { month: 'May', portfolio: 3950000, benchmark: 3710000 },
  { month: 'Jun', portfolio: 3780000, benchmark: 3650000 },
  { month: 'Jul', portfolio: 4120000, benchmark: 3800000 },
  { month: 'Aug', portfolio: 4250000, benchmark: 3870000 },
  { month: 'Sep', portfolio: 4080000, benchmark: 3820000 },
  { month: 'Oct', portfolio: 4380000, benchmark: 3950000 },
  { month: 'Nov', portfolio: 4520000, benchmark: 4020000 },
  { month: 'Dec', portfolio: 4410000, benchmark: 3990000 },
  { month: 'Jan', portfolio: 4680000, benchmark: 4110000 },
  { month: 'Feb', portfolio: 4820000, benchmark: 4200000 },
  { month: 'Mar', portfolio: 4523580, benchmark: 4150000 },
];

const allocationData = [
  { name: 'Equity', value: 55, color: '#6366f1' },
  { name: 'Debt', value: 25, color: '#14b8a6' },
  { name: 'Hybrid', value: 12, color: '#f59e0b' },
  { name: 'Gold', value: 8, color: '#ec4899' },
];

const goals = [
  { name: 'Retirement Corpus', target: 15000000, current: 4523580, years: 22, color: '#6366f1', icon: '🏖️' },
  { name: "Child's Education", target: 5000000, current: 1840000, years: 12, color: '#14b8a6', icon: '🎓' },
  { name: 'Dream Home', target: 8000000, current: 2200000, years: 8, color: '#f59e0b', icon: '🏡' },
  { name: 'Emergency Fund', target: 600000, current: 540000, years: 0, color: '#10b981', icon: '🛡️' },
];

const topFunds = [
  { name: 'Mirae Asset Large Cap', category: 'Large Cap', return3y: '18.4%', return5y: '21.2%', color: '#6366f1' },
  { name: 'Parag Parikh Flexi Cap', category: 'Flexi Cap', return3y: '22.1%', return5y: '25.8%', color: '#14b8a6' },
  { name: 'SBI Small Cap', category: 'Small Cap', return3y: '28.6%', return5y: '32.1%', color: '#f59e0b' },
  { name: 'HDFC Corporate Bond', category: 'Debt', return3y: '7.2%', return5y: '8.1%', color: '#ec4899' },
];

const recentActivity = [
  { icon: '📈', label: 'SIP Credited', detail: 'Mirae Large Cap — ₹5,000', time: 'Today', positive: true },
  { icon: '🎯', label: 'Goal Progress Updated', detail: "Child's Education — 36.8%", time: '2 days ago', positive: true },
  { icon: '⚠️', label: 'Insurance Gap Alert', detail: 'Life cover short by ₹25L', time: '5 days ago', positive: false },
  { icon: '📊', label: 'Monthly Report Ready', detail: 'March 2026 overview', time: '1 week ago', positive: true },
];

const insights = [
  {
    icon: <Lightbulb className="h-5 w-5" />,
    title: 'Increase Your SIP by ₹2,000',
    desc: 'A small bump now could add ₹18L to your retirement corpus by 2048.',
    color: '#6366f1',
    tag: 'AI Insight',
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: 'Life Insurance Gap Detected',
    desc: 'You are underinsured by ₹25 lakhs. Review your coverage for peace of mind.',
    color: '#ef4444',
    tag: 'Alert',
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: 'Portfolio Alpha: +3.2%',
    desc: 'Your portfolio is outperforming the benchmark by 3.2% this year.',
    color: '#10b981',
    tag: 'Performance',
  },
  {
    icon: <Target className="h-5 w-5" />,
    title: 'Home Goal On Track',
    desc: 'At current SIP, you will reach your home purchase goal in 7.8 years.',
    color: '#f59e0b',
    tag: 'Goals',
  },
];

const features = [
  {
    icon: <BarChart3 className="h-7 w-7" />,
    title: 'AI-Powered SIP Optimizer',
    desc: 'Let our AI automatically calculate the perfect SIP amount for each of your goals based on inflation, returns, and timelines.',
    color: '#6366f1',
  },
  {
    icon: <Target className="h-7 w-7" />,
    title: 'Multi-Goal Financial Planning',
    desc: 'Plan retirement, education, home, and any custom goal — all in one place with detailed projections.',
    color: '#14b8a6',
  },
  {
    icon: <Shield className="h-7 w-7" />,
    title: 'Insurance Gap Analysis',
    desc: 'Get personalized life and health insurance recommendations with real quotes from top providers.',
    color: '#f59e0b',
  },
  {
    icon: <Zap className="h-7 w-7" />,
    title: 'Mutual Fund Intelligence',
    desc: 'Analyze 4,000+ mutual funds with AI-extracted factsheet data, performance benchmarking, and portfolio fit scoring.',
    color: '#ec4899',
  },
];

function formatCurrency(val: number) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${val.toLocaleString('en-IN')}`;
}


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="border border-border bg-background p-3 rounded-lg text-sm min-w-[150px] shadow-md">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="text-xs">
            {p.name === 'portfolio' ? 'Your Portfolio' : 'Benchmark'}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const DynamicEmptyState = ({ title, description, buttonText, onAction }: { title: string, description: string, buttonText: string, onAction: () => void }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center glass rounded-3xl">
    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
      <Target className="h-8 w-8 text-primary" />
    </div>
    <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm max-w-xs mb-6">{description}</p>
    <Button onClick={onAction} className="glass-button-primary">
      {buttonText} <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </div>
);

export function LandingDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'portfolio' | 'insights'>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();

  const [plannerData, setPlannerData] = useState<any>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('financial_planner_form_data');
    if (saved) {
      setPlannerData(JSON.parse(saved));
    }
    setIsHydrated(true);
  }, []);

  const handleOpenPlanner = () => {
    router.push('/planner');
  };

  const realStats = useMemo(() => {
    if (!plannerData) return null;

    const getNumeric = (val: any) => typeof val === 'number' ? val : (parseFloat(val) || 0);

    const totalAssets = (plannerData.assets || []).reduce((sum: number, a: any) => sum + getNumeric(a.amount), 0);
    const totalLiabilities = (plannerData.liabilities || []).reduce((sum: number, l: any) => sum + getNumeric(l.amount), 0);
    const netWorth = totalAssets - totalLiabilities;

    const totalMonthlyIncome = (plannerData.incomes || []).reduce((sum: number, i: any) => sum + getNumeric(i.amount), 0);
    const totalMonthlyExpenses = (plannerData.expenses || []).reduce((sum: number, e: any) => sum + getNumeric(e.amount), 0);
    const monthlySIP = (plannerData.fundAllocations || []).reduce((sum: number, f: any) => sum + getNumeric(f.sipRequired), 0);

    const activeGoalsCount = (plannerData.goals || []).filter((g: any) => g.name).length;

    return {
      netWorth,
      monthlySIP,
      activeGoalsCount,
      savingsRate: totalMonthlyIncome > 0 ? Math.round(((totalMonthlyIncome - totalMonthlyExpenses) / totalMonthlyIncome) * 100) : 0,
      totalLiabilities
    };
  }, [plannerData]);

  const realGoals = useMemo(() => {
    if (!plannerData || !plannerData.goals) return [];
    return plannerData.goals
      .filter((g: any) => g.name && g.corpus)
      .map((g: any, i: number) => {
        const target = parseFloat(g.corpus) || 0;
        const current = parseFloat(g.currentSave) || 0;
        const years = parseInt(g.years) || 0;
        const colors = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#10b981'];
        const icons = ['🏖️', '🎓', '🏡', '🛡️', '🚗'];
        return {
          name: g.name,
          target,
          current,
          years,
          color: colors[i % colors.length],
          icon: icons[i % icons.length]
        };
      });
  }, [plannerData]);

  const realAllocation = useMemo(() => {
    if (!plannerData || !plannerData.fundAllocations) return [];
    const totals: Record<string, number> = {};
    let totalWeight = 0;

    plannerData.fundAllocations.forEach((f: any) => {
      const cat = f.fundCategory || 'Others';
      const weight = parseFloat(f.sipRequired) || 0;
      totals[cat] = (totals[cat] || 0) + weight;
      totalWeight += weight;
    });

    if (totalWeight === 0) return [];

    const colors: Record<string, string> = {
      'Equity': '#6366f1',
      'Debt': '#14b8a6',
      'Hybrid': '#f59e0b',
      'Solutions': '#ec4899',
      'Others': '#10b981'
    };

    return Object.entries(totals).map(([name, value]) => ({
      name,
      value: Math.round((value / totalWeight) * 100),
      color: colors[name] || '#94a3b8'
    }));
  }, [plannerData]);

  const realTopFunds = useMemo(() => {
    if (!plannerData || !plannerData.fundAllocations) return [];
    return plannerData.fundAllocations
      .filter((f: any) => f.schemeName && f.sipRequired)
      .slice(0, 4)
      .map((f: any) => ({
        name: f.schemeName,
        category: f.fundCategory || 'Mutual Fund',
        return3y: 'Fetching...',
        return5y: 'Fetching...',
        color: '#6366f1'
      }));
  }, [plannerData]);

  const realInsights = useMemo(() => {
    if (!realStats) return [];
    const items = [];

    if (realStats.savingsRate < 20) {
      items.push({
        icon: <Lightbulb className="h-5 w-5" />,
        title: 'Increase Your Savings',
        desc: `Your savings rate is currently ${realStats.savingsRate}%. Aim for 30% to reach your goals faster.`,
        color: '#f59e0b',
        tag: 'AI Insight',
      });
    } else if (realStats.savingsRate > 40) {
      items.push({
        icon: <TrendingUp className="h-5 w-5" />,
        title: 'Surplus Detected',
        desc: 'Great job! You have a high savings rate. Consider aggressive investments for long-term wealth.',
        color: '#10b981',
        tag: 'Strategy',
      });
    }

    if (realStats.totalLiabilities > 100000) {
      items.push({
        icon: <ShieldAlert className="h-5 w-5" />,
        title: 'Debt Reduction',
        desc: `You have ${formatCurrency(realStats.totalLiabilities)} in liabilities. Prioritize high-interest debt clearing.`,
        color: '#ef4444',
        tag: 'Alert',
      });
    }

    if (realGoals.length > 0) {
      const keyGoal = realGoals[0];
      const progress = Math.round((keyGoal.current / keyGoal.target) * 100);
      items.push({
        icon: <Target className="h-5 w-5" />,
        title: `${keyGoal.name} Progress`,
        desc: `You have achieved ${progress}% of your ${keyGoal.name} target. Keep going!`,
        color: '#6366f1',
        tag: 'Goals',
      });
    }

    return items;
  }, [realStats, realGoals]);

  const realActivity = useMemo(() => {
    if (!plannerData) return [];
    const items = [];
    if (plannerData.personalDetails?.name) {
      items.push({ icon: '👤', label: 'Profile Created', detail: plannerData.personalDetails.name, time: 'Today', positive: true });
    }
    if (plannerData.goals && plannerData.goals.length > 0) {
      items.push({ icon: '🎯', label: 'Goals Updated', detail: `${plannerData.goals.length} goals active`, time: 'Recently', positive: true });
    }
    if (plannerData.fundAllocations && plannerData.fundAllocations.length > 0) {
      items.push({ icon: '📈', label: 'Portfolio Sync', detail: `${plannerData.fundAllocations.length} funds allocated`, time: 'Recently', positive: true });
    }
    return items;
  }, [plannerData]);

  const realRecommendations = useMemo(() => {
    if (!realStats) return [];
    const items = [];
    if (realStats.savingsRate < 30) {
      items.push({ label: 'SIP Boost', text: `Increase SIP by 5% to reach goals ${Math.round(20 / realStats.savingsRate)} years faster`, type: 'primary' });
    }
    if (realStats.totalLiabilities > 0) {
      items.push({ label: 'Debt Alert', text: 'Clear high-interest debt before aggressive investing', type: 'destructive' });
    }
    if (realStats.netWorth > 0) {
      items.push({ label: 'Portfolio', text: 'Rebalance your portfolio every 6 months', type: 'accent' });
    }
    return items;
  }, [realStats]);

  return (
    <div className="min-h-screen">

      {/* ===== NAVBAR ===== */}
      <nav className="glass-header sticky top-0 z-50 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-20 gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative h-14 w-44 flex-shrink-0">
                <Image
                  src="/finfriend-planner-logo.png"
                  alt="FinFriend Planner"
                  fill
                  sizes="176px"
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                onClick={() => router.push('/login')}
                className="glass-button-outline hidden sm:flex items-center gap-2 font-semibold px-5"
              >
                Sign In
              </Button>
              <Button
                onClick={handleOpenPlanner}
                className="glass-button-primary hidden sm:flex items-center gap-2 text-primary-foreground font-semibold px-5"
              >
                Open Planner <ArrowRight className="h-4 w-4" />
              </Button>
              <button
                className="md:hidden p-2 rounded-xl glass-button-outline"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-1">
              <div className="pt-2">
                <Button onClick={handleOpenPlanner} className="w-full glass-button-primary text-primary-foreground">
                  Open Planner <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">

          <div className="inline-flex items-center gap-2 border border-border rounded-full px-4 py-2 mb-6 bg-muted">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">India's most comprehensive financial planner</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
            Plan Your Financial Future<br />
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-500 bg-clip-text text-transparent">
              with AI Intelligence
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Goal planning, SIP optimization, mutual fund analysis, insurance coverage, and professional reports — all powered by AI, designed for Indian investors.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Button
              onClick={handleOpenPlanner}
              size="lg"
              className="glass-button-primary text-primary-foreground font-bold text-base px-8 h-12"
            >
              Open My Planner
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Stats Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {(realStats ? [
              { label: 'Net Worth', display: formatCurrency(realStats.netWorth), icon: <Wallet className="h-5 w-5" />, color: '#6366f1' },
              { label: 'Monthly SIP', display: formatCurrency(realStats.monthlySIP), icon: <TrendingUp className="h-5 w-5" />, color: '#14b8a6' },
              { label: 'Active Goals', display: `${realStats.activeGoalsCount} goals`, icon: <Target className="h-5 w-5" />, color: '#f59e0b' },
              { label: 'Savings Rate', display: `${realStats.savingsRate}%`, icon: <Activity className="h-5 w-5" />, color: '#ec4899' },
            ] : [
              { label: 'Total Assets', display: '₹0', icon: <Wallet className="h-5 w-5" />, color: '#6366f1' },
              { label: 'Monthly SIP', display: '₹0', icon: <TrendingUp className="h-5 w-5" />, color: '#14b8a6' },
              { label: 'Active Goals', display: '0', icon: <Target className="h-5 w-5" />, color: '#f59e0b' },
              { label: 'Liabilities', display: '₹0', icon: <Activity className="h-5 w-5" />, color: '#ec4899' },
            ]).map((stat, i) => (
              <div
                key={i}
                className="glass-card p-5 rounded-2xl text-left"
              >
                <div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3"
                  style={{ background: `${stat.color}25`, color: stat.color }}
                >
                  {stat.icon}
                </div>
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-xl font-bold text-foreground">{stat.display}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DASHBOARD PREVIEW ===== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="glass-card rounded-3xl overflow-hidden">
          {/* Tab Bar */}
          <div className="border-b border-[var(--glass-border)] px-6 pt-5">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {[
                { id: 'overview', label: 'Overview', icon: <Home className="h-4 w-4" /> },
                { id: 'goals', label: 'Goals', icon: <Target className="h-4 w-4" /> },
                { id: 'portfolio', label: 'Portfolio', icon: <PieChartIcon className="h-4 w-4" /> },
                { id: 'insights', label: 'AI Insights', icon: <Lightbulb className="h-4 w-4" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-all duration-200 whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-primary text-primary bg-white/20 dark:bg-white/8'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/10'
                    }
                  `}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(realStats ? [
                    { label: 'Total Portfolio Value', value: formatCurrency(realStats.netWorth), change: '+14.2% CAGR', positive: true, icon: <TrendingUp className="h-5 w-5" /> },
                    { label: 'Monthly SIP', value: formatCurrency(realStats.monthlySIP), change: `${realStats.savingsRate}% savings rate`, positive: true, icon: <Wallet className="h-5 w-5" /> },
                    { label: 'Total Liabilities', value: formatCurrency(realStats.totalLiabilities), change: 'Based on your entries', positive: true, icon: <DollarSign className="h-5 w-5" /> },
                  ] : [
                    { label: 'Total Portfolio Value', value: '₹0', change: '0% CAGR', positive: true, icon: <TrendingUp className="h-5 w-5" /> },
                    { label: 'Monthly Savings', value: '₹0', change: '0% savings rate', positive: true, icon: <Wallet className="h-5 w-5" /> },
                    { label: 'Total Liabilities', value: '₹0', change: 'No debt added', positive: true, icon: <DollarSign className="h-5 w-5" /> },
                  ]).map((card, i) => (
                    <div key={i} className="glass p-4 rounded-2xl relative overflow-hidden">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-xl glass-section-icon text-primary">{card.icon}</div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${card.positive ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-red-500/15 text-red-500'}`}>
                          {card.change}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                      <p className="text-2xl font-bold text-foreground">{card.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">Portfolio vs Benchmark (12 Months)</h3>
                    <Badge variant="secondary" className="text-xs">+3.2% Alpha</Badge>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={portfolioData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,180,0.1)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis
                          tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                          width={40}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="benchmark" name="benchmark" stroke="#14b8a6" strokeWidth={1.5} fill="url(#benchmarkGradient)" strokeDasharray="4 4" />
                        <Area type="monotone" dataKey="portfolio" name="portfolio" stroke="#6366f1" strokeWidth={2.5} fill="url(#portfolioGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* GOALS TAB */}
            {activeTab === 'goals' && (
              <div>
                {realGoals.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {realGoals.map((goal: any, i: number) => {
                      const progress = Math.round((goal.current / goal.target) * 100);
                      return (
                        <div key={i} className="glass p-5 rounded-2xl">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">{goal.icon}</span>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground text-sm">{goal.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {goal.years > 0 ? `${goal.years} years remaining` : 'Target reached soon!'}
                              </p>
                            </div>
                            <Badge className="text-xs font-bold" style={{ background: `${goal.color}22`, color: goal.color, border: `1px solid ${goal.color}44` }}>
                              {progress}%
                            </Badge>
                          </div>
                          <div className="mb-3">
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: `${goal.color}20` }}>
                              <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{
                                  width: `${progress}%`,
                                  background: `linear-gradient(90deg, ${goal.color}cc, ${goal.color})`,
                                  boxShadow: `0 0 8px ${goal.color}66`
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Accumulated: <span className="font-semibold text-foreground">{formatCurrency(goal.current)}</span></span>
                            <span>Target: <span className="font-semibold text-foreground">{formatCurrency(goal.target)}</span></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <DynamicEmptyState
                    title="No Goals Found"
                    description="You haven't added any goals yet. Start planning to track your retirement, education, and home goals."
                    buttonText="Create My First Goal"
                    onAction={handleOpenPlanner}
                  />
                )}
                {realGoals.length > 0 && (
                  <div className="mt-4 text-center">
                    <Button onClick={handleOpenPlanner} className="glass-button-primary text-primary-foreground">
                      Plan More Goals <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* PORTFOLIO TAB */}
            {activeTab === 'portfolio' && (
              <div>
                {realAllocation.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-foreground mb-4">Asset Allocation</h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={realAllocation}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {realAllocation.map((entry: any, index: number) => (
                                <Cell key={index} fill={entry.color} stroke="transparent" />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: any) => [`${v}%`, '']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2 justify-center">
                        {realAllocation.map((a: any, i: number) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
                            {a.name} {a.value}%
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground mb-4">Top Holdings</h3>
                      <div className="space-y-3">
                        {realTopFunds.length > 0 ? realTopFunds.map((fund: any, i: number) => (
                          <div key={i} className="glass p-3 rounded-xl flex items-center gap-3">
                            <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ background: fund.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{fund.name}</p>
                              <p className="text-xs text-muted-foreground">{fund.category}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-muted-foreground">3Y | 5Y</p>
                              <p className="text-sm font-semibold" style={{ color: fund.color }}>{fund.return3y} | {fund.return5y}</p>
                            </div>
                          </div>
                        )) : (
                          <p className="text-sm text-muted-foreground text-center py-8">No funds selected yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <DynamicEmptyState
                    title="Portfolio Empty"
                    description="Allocate your monthly surplus to mutual funds to see your asset distribution and top holdings here."
                    buttonText="Start Portfolio Allocation"
                    onAction={handleOpenPlanner}
                  />
                )}
              </div>
            )}

            {/* INSIGHTS TAB */}
            {activeTab === 'insights' && (
              <div>
                {realInsights.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {realInsights.map((insight: any, i: number) => (
                      <div key={i} className="glass p-5 rounded-2xl">
                        <div className="flex items-start gap-3">
                          <div
                            className="p-2 rounded-xl flex-shrink-0 mt-0.5"
                            style={{ background: `${insight.color}22`, color: insight.color }}
                          >
                            {insight.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${insight.color}20`, color: insight.color }}>
                                {insight.tag}
                              </span>
                            </div>
                            <h4 className="font-semibold text-foreground text-sm mb-1">{insight.title}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">{insight.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <DynamicEmptyState
                    title="No Insights Yet"
                    description="Add your income, expenses, and goals in the planner to generate personalized AI insights."
                    buttonText="Analyze My Finances"
                    onAction={handleOpenPlanner}
                  />
                )}
                {realInsights.length > 0 && (
                  <div className="mt-4 text-center">
                    <Button onClick={handleOpenPlanner} className="glass-button-primary text-primary-foreground">
                      Get More Insights <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Plan Your Wealth
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From goal planning to fund analysis, FinFriend Planner covers every aspect of your financial journey.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="glass-card p-6 rounded-2xl"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `${f.color}20`, color: f.color }}
              >
                {f.icon}
              </div>
              <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== ACTIVITY + RECOMMENDATIONS ===== */}
      {plannerData && (realActivity.length > 0 || realRecommendations.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Recent Activity */}
            {realActivity.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Recent Activity
                  </h3>
                  <Badge variant="secondary" className="text-xs">{realActivity.length} updates</Badge>
                </div>
                <div className="space-y-3">
                  {realActivity.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 glass rounded-xl">
                      <span className="text-xl flex-shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{item.time}</span>
                        {item.positive
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          : <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Smart Recommendations */}
            {realRecommendations.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-bold text-foreground flex items-center gap-2 mb-6">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Smart Recommendations
                </h3>
                <div className="space-y-4">
                  {realRecommendations.map((rec, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 glass rounded-xl group hover:border-primary/30 transition-colors">
                      <Badge className={`text-[10px] uppercase font-bold py-1 px-2 ${rec.type === 'primary' ? 'bg-primary/15 text-primary' :
                          rec.type === 'destructive' ? 'bg-red-500/15 text-red-500' :
                            'bg-amber-500/15 text-amber-500'
                        }`}>
                        {rec.label}
                      </Badge>
                      <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
                        {rec.text}
                      </p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="glass-header border-t mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-36">
                <Image src="/finfriend-planner-logo.png" alt="FinFriend Planner" fill sizes="144px" style={{ objectFit: 'contain' }} />
              </div>
              <span className="text-sm text-muted-foreground">Your trusted financial planning partner.</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>© {new Date().getFullYear()} FinFriend Planner</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
