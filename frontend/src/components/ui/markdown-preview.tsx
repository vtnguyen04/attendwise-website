'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from './skeleton';
import React from 'react';
import { Pluggable } from 'unified';
import { Components } from 'react-markdown';

const ReactMarkdown = dynamic(() => import('react-markdown'), {
  loading: () => <Skeleton className="h-20 w-full" />,
});

import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownPreviewProps {
  content: string;
  remarkPlugins?: Pluggable[];
  rehypePlugins?: Pluggable[];
  components?: Partial<Components>;
}

export function MarkdownPreview({
  content,
  remarkPlugins = [],
  rehypePlugins = [],
  components,
}: MarkdownPreviewProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[...remarkPlugins, remarkGfm]}
      rehypePlugins={[...rehypePlugins, rehypeRaw]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
