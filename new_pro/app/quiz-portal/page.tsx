import React, { Suspense } from 'react';
import QuizPortalPage from './QuizPortalPage';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-stone-200 flex flex-col justify-center items-center gap-4">
        <div className="w-10 h-10 border-4 border-stone-800 border-t-[#D4AF37] rounded-full animate-spin"></div>
        <p className="text-sm font-medium tracking-wide text-stone-400">Loading Quiz Portal...</p>
      </div>
    }>
      <QuizPortalPage />
    </Suspense>
  );
}
