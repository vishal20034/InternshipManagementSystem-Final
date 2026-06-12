import React, { Suspense } from 'react';
import VerifyPage from './VerifyPage';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FBF7EE] text-[#1E1A17] flex flex-col justify-center items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#E2D9CD] border-t-[#CB5534] rounded-full animate-spin"></div>
        <p className="text-sm font-semibold tracking-wide text-[#5C524C]">Loading Document Verification...</p>
      </div>
    }>
      <VerifyPage />
    </Suspense>
  );
}
