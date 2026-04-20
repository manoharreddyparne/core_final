import React, { useEffect, useState } from 'react';

export const DeviceGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const checkDevice = () => {
      const ua = navigator.userAgent.toLowerCase();
      const mobileTerms = ['iphone', 'android', 'mobile', 'ipad', 'touch', 'tablet'];
      const results = mobileTerms.some(term => ua.includes(term));
      setIsMobile(results);
    };
    checkDevice();
  }, []);

  if (isMobile === null) return null; // Loading state

  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-800 border border-red-500/30 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Device Restricted</h1>
          <p className="text-slate-400 mb-8">
            This examination is configured with <span className="text-red-400 font-semibold">Strict Device Policy</span>. 
            Mobile phones and tablets are not permitted. Please use a Laptop or Desktop browser to continue.
          </p>
          <div className="p-4 bg-slate-900/50 rounded-lg text-sm text-slate-500 font-mono">
            Detected: {navigator.userAgent.split(')')[0]})
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
