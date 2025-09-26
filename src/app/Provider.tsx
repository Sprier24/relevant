'use client';

import { AuthProvider } from '../app/context/AuthContext'; // update path accordingly

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
