
'use client';

import Image from 'next/image';
import { Community } from '@/lib/types';
import { getSafeImageUrl } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

interface CommunityCoverImageProps {
  community: Community;
}

export function CommunityCoverImage({ community }: CommunityCoverImageProps) {
  const { t } = useTranslation('community');
  const coverImageUrl = getSafeImageUrl(community.cover_image_url);

  return (
    <div className="h-80 md:h-96 w-full relative">
      <Image
        src={coverImageUrl}
        alt={t('cover_image.alt', { communityName: community.name })}
        fill
        className="object-cover blur-xs"
        priority
      />
    </div>
  );
}
