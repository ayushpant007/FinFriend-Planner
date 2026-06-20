"use client";

import { useRouter } from 'next/navigation';
import LoginCardSection from '@/components/ui/login-signup';

export default function Home() {
  const router = useRouter();

  return (
    <LoginCardSection onSuccess={() => router.push('/planner')} />
  );
}
