"use client";

import { FormSection } from './FormSection';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';
import type { PersonalDetails } from '@/lib/types';

interface Props {
  details: PersonalDetails;
  setDetails: React.Dispatch<React.SetStateAction<PersonalDetails>>;
  isModal?: boolean;
}

export function PersonalDetailsForm({ details, setDetails, isModal = false }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setDetails(prev => ({ ...prev, [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value }));
  };

  const content = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="pd-name">Full Name</Label>
        <Input
          id="pd-name"
          name="name"
          placeholder="e.g., Jane Doe"
          value={details.name}
          onChange={handleChange}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pd-dob">Date of Birth</Label>
        <Input
          id="pd-dob"
          name="dob"
          type="date"
          value={details.dob}
          onChange={handleChange}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pd-dependents">Number of Dependents</Label>
        <Input
          id="pd-dependents"
          name="dependents"
          type="number"
          min="0"
          placeholder="0"
          value={details.dependents === '' ? '' : details.dependents}
          onChange={handleChange}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pd-retirement">Retirement Age</Label>
        <Input
          id="pd-retirement"
          name="retirementAge"
          type="number"
          min="40"
          max="80"
          placeholder="60"
          value={details.retirementAge === '' ? '' : details.retirementAge}
          onChange={handleChange}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pd-mobile">Mobile Number</Label>
        <Input
          id="pd-mobile"
          name="mobile"
          type="tel"
          placeholder="e.g., +91 9876543210"
          value={details.mobile}
          onChange={handleChange}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pd-email">Email Address</Label>
        <Input
          id="pd-email"
          name="email"
          type="email"
          placeholder="e.g., jane@example.com"
          value={details.email}
          onChange={handleChange}
        />
      </div>
       <div className="space-y-2 md:col-span-2">
        <Label htmlFor="pd-arn">ARN (Optional)</Label>
        <Input
          id="pd-arn"
          name="arn"
          type="text"
          placeholder="Enter ARN if available"
          value={details.arn || ''}
          onChange={handleChange}
        />
      </div>
    </div>
  );

  if (isModal) {
    return content;
  }

  return (
    <FormSection
      title="Personal Details"
      description="Let's start with some basic information."
      icon={<User className="h-6 w-6" />}
    >
      {content}
    </FormSection>
  );
}
