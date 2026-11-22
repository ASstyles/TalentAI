'use client';

import React from 'react';
import RouteGuard from '@/components/RouteGuard';

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['recruiter', 'admin']} portalName="recruiter">
      {children}
    </RouteGuard>
  );
}
