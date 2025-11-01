'use client';

import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { ReactNode } from 'react';

interface TonConnectProviderProps {
  children: ReactNode;
}

export const TonConnectProvider: React.FC<TonConnectProviderProps> = ({ children }) => {
  return (
    <TonConnectUIProvider manifestUrl="https://collectablekit.01studio.xyz/tonconnect-manifest.json">
      {children}
    </TonConnectUIProvider>
  );
};
