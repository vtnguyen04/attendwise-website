'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from './skeleton';
import React from 'react';

const ReactMarkdown = dynamic(() => import('react-markdown'), {
  loading: () => <Skeleton className="h-20 w-full" />,
  ssr: false,
});

// Dynamically import remark-gfm and rehype-raw
const RemarkGfm = dynamic(() => import('remark-gfm'), { ssr: false });
const RehypeRaw = dynamic(() => import('rehype-raw') as any, { ssr: false });

interface MarkdownPreviewProps {
  content: string;
  remarkPlugins?: any[];
  rehypePlugins?: any[];
  components?: any;
}

export function MarkdownPreview({
  content,
  remarkPlugins = [],
  rehypePlugins = [],
  components,
}: MarkdownPreviewProps) {
  const allRemarkPlugins = React.useMemo(() => {
    const plugins = [...remarkPlugins];
    // Ensure RemarkGfm is included if not already present and available
    if (!plugins.some(plugin => plugin === RemarkGfm) && RemarkGfm) {
      plugins.push(RemarkGfm);
    }
    return plugins;
  }, [remarkPlugins]);

  const allRehypePlugins = React.useMemo(() => {
    const plugins = [...rehypePlugins];
    // Ensure RehypeRaw is included if not already present and available
    if (!plugins.some(plugin => plugin === RehypeRaw) && RehypeRaw) {
      plugins.push(RehypeRaw);
    }
    return plugins;
  }, [rehypePlugins]);

  return (
    <ReactMarkdown
      remarkPlugins={allRemarkPlugins}
      rehypePlugins={allRehypePlugins}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
