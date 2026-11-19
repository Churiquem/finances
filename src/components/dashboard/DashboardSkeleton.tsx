'use client';

import React from 'react';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 4 Summary Cards Skeletons */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200 bg-white p-4.5 dark:border-zinc-800 dark:bg-zinc-900/80"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 rounded-md bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-9 w-9 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="mt-3.5 h-7 w-36 rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-3 w-48 rounded-md bg-zinc-100 dark:bg-zinc-800/60" />
          </div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        <div className="h-7 w-28 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-7 w-32 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-7 w-32 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* 2 Blocks Skeletons */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 p-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                <div className="space-y-1">
                  <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800/60" />
                </div>
              </div>
              <div className="h-5 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 p-2">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-36 rounded bg-zinc-200 dark:bg-zinc-800" />
                      <div className="h-2.5 w-20 rounded bg-zinc-100 dark:bg-zinc-800/60" />
                    </div>
                  </div>
                  <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
