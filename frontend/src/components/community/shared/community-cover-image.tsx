
import Image from 'next/image';
import { Community } from '@/lib/types';
import { getNullableStringValue } from '@/lib/utils';

interface CommunityCoverImageProps {
  community: Community;
}

export function CommunityCoverImage({ community }: CommunityCoverImageProps) {
  const coverImageUrl = getNullableStringValue(community.cover_image_url) || `http://localhost:9000/attendwise/405a368a0202885cd11310.jpg`;

  return (
    <div className="h-80 md:h-96 w-full relative">
      <Image
        src={coverImageUrl}
        alt={`${community.name} cover image`}
        fill
        className="object-cover blur-xs"
        priority
      />
    </div>
  );
}
