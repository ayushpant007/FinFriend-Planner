"use client";

import { Award, TrendingUp, Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FundScorecardProps {
  score: number;
  alpha?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  isTopTenPercent?: boolean;
  compact?: boolean;
}

export function FundScorecard({ 
  score, 
  alpha, 
  sharpeRatio, 
  maxDrawdown, 
  isTopTenPercent,
  compact = false 
}: FundScorecardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 4) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 6) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (score >= 4) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Average';
    return 'Below Average';
  };

  const progressWidth = (score / 10) * 100;
  const progressColor = score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : score >= 4 ? 'bg-orange-500' : 'bg-red-500';

  if (compact) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium",
        getScoreBgColor(score),
        getScoreColor(score)
      )}>
        {isTopTenPercent && <Award className="h-3.5 w-3.5" />}
        <span>{score.toFixed(1)}/10</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-lg border p-4",
      getScoreBgColor(score)
    )}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-muted-foreground">FinFriend Score</h4>
            {isTopTenPercent && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                <Award className="h-3 w-3" />
                Top 10%
              </span>
            )}
          </div>
          <div className={cn("text-3xl font-bold mt-1", getScoreColor(score))}>
            {score.toFixed(1)}
            <span className="text-lg font-normal opacity-60">/10</span>
          </div>
          <p className={cn("text-sm", getScoreColor(score))}>{getScoreLabel(score)}</p>
        </div>
        
        <div className="text-right">
          <div className="w-20 h-20 relative">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted/20"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${progressWidth}, 100`}
                className={getScoreColor(score)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className={cn("h-6 w-6", getScoreColor(score))} />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-muted/30 rounded-full h-2 mb-4">
        <div 
          className={cn("h-2 rounded-full transition-all", progressColor)} 
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      {(alpha !== undefined || sharpeRatio !== undefined || maxDrawdown !== undefined) && (
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-current/10">
          {alpha !== undefined && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" />
                Alpha
              </div>
              <div className={cn(
                "text-sm font-semibold",
                alpha >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {alpha >= 0 ? '+' : ''}{(alpha * 100).toFixed(2)}%
              </div>
            </div>
          )}
          
          {sharpeRatio !== undefined && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Shield className="h-3 w-3" />
                Sharpe
              </div>
              <div className="text-sm font-semibold">
                {sharpeRatio.toFixed(2)}
              </div>
            </div>
          )}
          
          {maxDrawdown !== undefined && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <AlertTriangle className="h-3 w-3" />
                Max DD
              </div>
              <div className="text-sm font-semibold text-red-600">
                -{(maxDrawdown * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
