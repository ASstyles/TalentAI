'use client';

import React from 'react';
import RouteGuard from '@/components/RouteGuard';

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['candidate', 'admin']} portalName="candidate">
      {children}
    </RouteGuard>
  );
}
