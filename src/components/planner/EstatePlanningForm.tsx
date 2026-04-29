"use client";

import { useState } from 'react';
import { FormSection } from './FormSection';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  willStatus: 'yes' | 'no' | null;
  setWillStatus: (status: 'yes' | 'no' | null) => void;
}

export function EstatePlanningForm({ willStatus, setWillStatus }: Props) {
  
  const handleValueChange = (value: 'yes' | 'no') => {
    setWillStatus(value);
  }

  return (
    <FormSection
      title="Estate Planning"
      description="Ensure your assets are distributed according to your wishes."
      icon={<FileText className="h-6 w-6" />}
      className="xl:col-span-2"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Have you written your will till date?</Label>
          <RadioGroup 
            value={willStatus ?? ""}
            onValueChange={handleValueChange}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="will-yes" />
              <Label htmlFor="will-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="will-no" />
              <Label htmlFor="will-no">No</Label>
            </div>
          </RadioGroup>
        </div>

        {willStatus === 'yes' && (
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <p className="font-semibold text-green-700 dark:text-green-300">
                  Estate planning - done
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {willStatus === 'no' && (
          <Card className="bg-orange-500/10 border-orange-500/20">
             <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-orange-600 mt-0.5" />
                    <p className="font-semibold text-orange-700 dark:text-orange-300">
                        Estate planning is pending — we recommend initiating it to ensure smooth and secure wealth transfer.
                    </p>
                </div>
            </CardContent>
          </Card>
        )}
      </div>
    </FormSection>
  );
}
