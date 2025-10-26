'use client';

// DON'T AUTO-LOAD SDK - Load it dynamically ONLY when needed
// Per Monetag docs: https://docs.monetag.com/docs/ad-integration/rewarded-interstitial/
// Loading SDK on component mount causes infinite loading screen

export const MonetagSDK: React.FC = () => {
  // This component does NOTHING on mount
  // The SDK will be loaded dynamically when an ad is triggered
  return null;
};
