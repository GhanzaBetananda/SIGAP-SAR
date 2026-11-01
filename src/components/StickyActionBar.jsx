/**
 * Bar aksi di bagian bawah layar — dirancang untuk jangkauan jempol
 * (thumb zone) pada HP Android. Bahannya blur + safe-area bawah.
 */
export default function StickyActionBar({ children }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="safe-area-bottom mx-auto flex w-full max-w-3xl items-center gap-2 px-4 pt-3">
        {children}
      </div>
    </div>
  );
}
