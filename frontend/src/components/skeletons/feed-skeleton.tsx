'use client';

export function FeedSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {[...Array(3)].map((_, index) => (
        <div
          key={index}
          className="relative overflow-hidden rounded-2xl bg-slate-900/50 border border-white/5 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />

          {/* Post Header */}
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 animate-ping" />
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-gradient-to-r from-slate-800 to-slate-700 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gradient-to-r from-slate-800 to-slate-700 rounded animate-pulse" style={{ animationDelay: '100ms' }} />
            </div>

            {/* Menu Dots */}
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-slate-700 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
              ))}
            </div>
          </div>

          {/* Post Content */}
          <div className="space-y-3 mb-4">
            <div className="h-4 w-full bg-gradient-to-r from-slate-800 to-slate-700 rounded animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="h-4 w-5/6 bg-gradient-to-r from-slate-800 to-slate-700 rounded animate-pulse" style={{ animationDelay: '300ms' }} />
            <div className="h-4 w-4/6 bg-gradient-to-r from-slate-800 to-slate-700 rounded animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>

          {/* Image Placeholder (for some cards) */}
          {index === 1 && (
            <div className="relative h-48 mb-4 bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl overflow-hidden animate-pulse">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-12 h-12 text-slate-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex items-center gap-6 pt-4 border-t border-white/5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-slate-800 to-slate-700 animate-pulse" style={{ animationDelay: `${(i + 5) * 100}ms` }} />
                <div className="h-3 w-8 bg-gradient-to-r from-slate-800 to-slate-700 rounded animate-pulse" style={{ animationDelay: `${(i + 6) * 100}ms` }} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Global Shimmer Animation */}
      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}