
"use client";

import { useState } from 'react';
import type { LifeInsuranceQuote, HealthInsuranceQuote } from '@/lib/types';
import { FormSection } from './FormSection';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldPlus, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

interface Props {
  lifeQuotes: LifeInsuranceQuote[];
  setLifeQuotes: React.Dispatch<React.SetStateAction<LifeInsuranceQuote[]>>;
  healthQuotes: HealthInsuranceQuote[];
  setHealthQuotes: React.Dispatch<React.SetStateAction<HealthInsuranceQuote[]>>;
}

let nextId = 0;

const initialLifeQuote: Omit<LifeInsuranceQuote, 'id'> = {
    planName: '',
    premiumAmount: '',
    premiumPaymentTerm: '',
    policyTerm: '',
    coverAmount: ''
};

const initialHealthQuote: Omit<HealthInsuranceQuote, 'id'> = {
    company: '',
    planName: '',
    premium1Y: '',
    sumAssured: '',
    preHospitalization: '',
    postHospitalization: '',
    waitingPeriodPED: '',
    roomRent: '',
    restoreBenefit: '',
    ambulanceRoad: '',
    ambulanceAir: '',
    healthCheckup: '',
    eConsultation: ''
};

export function InsuranceQuotesForm({ lifeQuotes, setLifeQuotes, healthQuotes, setHealthQuotes }: Props) {
  
  const handleAddQuote = (type: 'life' | 'health') => {
    if (type === 'life') {
      setLifeQuotes(prev => [...prev, { id: `life-${nextId++}`, ...initialLifeQuote }]);
    } else {
      setHealthQuotes(prev => [...prev, { id: `health-${nextId++}`, ...initialHealthQuote }]);
    }
  };

  const handleRemoveQuote = (type: 'life' | 'health', id: string) => {
    if (type === 'life') {
      setLifeQuotes(prev => prev.filter(q => q.id !== id));
    } else {
      setHealthQuotes(prev => prev.filter(q => q.id !== id));
    }
  };

  const handleLifeQuoteChange = (id: string, field: keyof LifeInsuranceQuote, value: string | number) => {
    setLifeQuotes(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleHealthQuoteChange = (id: string, field: keyof HealthInsuranceQuote, value: string | number) => {
    setHealthQuotes(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };
  
  const renderLifeQuoteForm = (quote: LifeInsuranceQuote) => (
    <Card key={quote.id} className="mt-4 p-4 space-y-4 border-dashed relative">
        <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => handleRemoveQuote('life', quote.id)}>
            <Trash2 className="h-4 w-4" />
        </Button>
        <h4 className="font-semibold text-md text-primary">Life Insurance Quotation</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <Label>Plan Name</Label>
                <Input value={quote.planName} onChange={e => handleLifeQuoteChange(quote.id, 'planName', e.target.value)} />
            </div>
            <div className="space-y-1.5">
                <Label>Premium Amount (₹)</Label>
                <Input type="number" value={quote.premiumAmount} onChange={e => handleLifeQuoteChange(quote.id, 'premiumAmount', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
                <Label>Premium Payment Term</Label>
                <Input value={quote.premiumPaymentTerm} onChange={e => handleLifeQuoteChange(quote.id, 'premiumPaymentTerm', e.target.value)} />
            </div>
             <div className="space-y-1.5">
                <Label>Policy Term</Label>
                <Input value={quote.policyTerm} onChange={e => handleLifeQuoteChange(quote.id, 'policyTerm', e.target.value)} />
            </div>
             <div className="space-y-1.5">
                <Label>Cover Amount (₹)</Label>
                <Input type="number" value={quote.coverAmount} onChange={e => handleLifeQuoteChange(quote.id, 'coverAmount', Number(e.target.value))} />
            </div>
        </div>
    </Card>
  );

  const renderHealthQuoteForm = (quote: HealthInsuranceQuote) => (
     <Card key={quote.id} className="mt-4 p-4 space-y-4 border-dashed relative">
        <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => handleRemoveQuote('health', quote.id)}>
            <Trash2 className="h-4 w-4" />
        </Button>
        <h4 className="font-semibold text-md text-primary">Health Insurance Quotation</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>Company</Label><Input value={quote.company} onChange={e => handleHealthQuoteChange(quote.id, 'company', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Plan Name</Label><Input value={quote.planName} onChange={e => handleHealthQuoteChange(quote.id, 'planName', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Premium (1Y)</Label><Input type="number" value={quote.premium1Y} onChange={e => handleHealthQuoteChange(quote.id, 'premium1Y', Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label>Sum Assured</Label><Input value={quote.sumAssured} onChange={e => handleHealthQuoteChange(quote.id, 'sumAssured', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Pre-Hospitalization</Label><Select value={quote.preHospitalization} onValueChange={(v: any) => handleHealthQuoteChange(quote.id, 'preHospitalization', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Covered">Covered</SelectItem><SelectItem value="Not Covered">Not Covered</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Post-Hospitalization</Label><Select value={quote.postHospitalization} onValueChange={(v: any) => handleHealthQuoteChange(quote.id, 'postHospitalization', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Covered">Covered</SelectItem><SelectItem value="Not Covered">Not Covered</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Waiting Period (PED)</Label><Select value={quote.waitingPeriodPED} onValueChange={(v: any) => handleHealthQuoteChange(quote.id, 'waitingPeriodPED', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Covered">Covered</SelectItem><SelectItem value="Not Covered">Not Covered</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Room Rent</Label><Select value={quote.roomRent} onValueChange={(v: any) => handleHealthQuoteChange(quote.id, 'roomRent', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="No cap">No cap</SelectItem><SelectItem value="Optional cap">Optional cap</SelectItem><SelectItem value="Private room">Private room</SelectItem><SelectItem value="Single private room">Single private room</SelectItem><SelectItem value="All Types of Rooms">All Types of Rooms</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Restore Benefit</Label><Select value={quote.restoreBenefit} onValueChange={(v: any) => handleHealthQuoteChange(quote.id, 'restoreBenefit', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="(Full SI)">(Full SI)</SelectItem><SelectItem value="(Once)">(Once)</SelectItem><SelectItem value="(Unlimited)">(Unlimited)</SelectItem><SelectItem value="(Unlimited for same/different illness)">(Unlimited for same/different illness)</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Ambulance (Road)</Label><Select value={quote.ambulanceRoad} onValueChange={(v: any) => handleHealthQuoteChange(quote.id, 'ambulanceRoad', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Included">Included</SelectItem><SelectItem value="Excluded">Excluded</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Ambulance (Air)</Label><Select value={quote.ambulanceAir} onValueChange={(v: any) => handleHealthQuoteChange(quote.id, 'ambulanceAir', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Optional">Optional</SelectItem><SelectItem value="Included">Included</SelectItem><SelectItem value="Excluded">Excluded</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Health Check-up</Label><Select value={quote.healthCheckup} onValueChange={(v: any) => handleHealthQuoteChange(quote.id, 'healthCheckup', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Covered">Covered</SelectItem><SelectItem value="Not Covered">Not Covered</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>E-Consultation</Label><Select value={quote.eConsultation} onValueChange={(v: any) => handleHealthQuoteChange(quote.id, 'eConsultation', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Included">Included</SelectItem><SelectItem value="Not included">Not included</SelectItem></SelectContent></Select></div>
        </div>
     </Card>
  );

  return (
    <FormSection
      title="Insurance Analysis"
      description="Add and compare insurance quotations (optional)."
      icon={<ShieldPlus className="h-6 w-6" />}
      className="xl:col-span-2"
    >
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-2">Life Insurance Quotes</h3>
          {lifeQuotes.map(quote => renderLifeQuoteForm(quote))}
          <Button variant="outline" size="sm" onClick={() => handleAddQuote('life')} className="mt-3"><PlusCircle className="mr-2 h-4 w-4" /> Add Life Insurance Quotation</Button>
        </div>
        
        <div>
          <h3 className="font-semibold text-lg mb-2">Health Insurance Quotes</h3>
          {healthQuotes.map(quote => renderHealthQuoteForm(quote))}
          <Button variant="outline" size="sm" onClick={() => handleAddQuote('health')} className="mt-3"><PlusCircle className="mr-2 h-4 w-4" /> Add Health Insurance Quotation</Button>
        </div>
      </div>
    </FormSection>
  );
}
