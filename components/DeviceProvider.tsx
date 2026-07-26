'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BanIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeviceContextType {
  isMobile: boolean;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const t = useTranslations('common');

  useEffect(() => {
    // The user agent cannot change while the page is open, so this only needs
    // to run once.
    const userAgent = navigator.userAgent.toLowerCase();
    setIsMobile(/android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent));
  }, []);

  if (isMobile && !warningDismissed) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center p-4 z-50">
        <div className="rounded-lg p-6 text-center max-w-md flex flex-col items-center">
          <BanIcon className="w-10 h-10 mb-4" />
          <h2 className="text-xl font-bold mb-4">{t('mobileNotSupported')}</h2>
          <p>{t('pleaseUseComputer')}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-6 rounded-xl"
            onClick={() => setWarningDismissed(true)}
          >
            {t('continueAnyway')}
          </Button>
        </div>
      </div>
    );
  }

  return <DeviceContext.Provider value={{ isMobile }}>{children}</DeviceContext.Provider>;
};

export default DeviceProvider;
