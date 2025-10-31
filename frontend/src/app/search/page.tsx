import { Suspense } from 'react';
import Search from './search';

export default function SearchPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-glow mb-6">Global Search</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <Search />
      </Suspense>
    </div>
  );
}
