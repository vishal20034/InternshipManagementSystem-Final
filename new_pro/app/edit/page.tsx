import { Suspense } from "react";
import EditPage from "./EditPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-stone-200">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-800 border-t-[#D4AF37]" />
        </div>
      }
    >
      <EditPage />
    </Suspense>
  );
}
