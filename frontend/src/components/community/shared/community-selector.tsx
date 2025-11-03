import React from "react";
import { Community } from "@/lib/types";
import { GlassCard } from "@/components/ui/glass-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from '@/hooks/use-translation';

interface CommunitySelectorProps {
  adminCommunities: Community[];
  selectedCommunityId: string | null;
  setSelectedCommunityId: (id: string | null) => void;
  isUpdating: boolean;
}

const CommunitySelector = React.memo(
  ({ adminCommunities, selectedCommunityId, setSelectedCommunityId, isUpdating }: CommunitySelectorProps) => {
    const { t } = useTranslation('community');
    return (
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">{t('selector.title')}</h2>
        <Select
          onValueChange={setSelectedCommunityId}
          value={selectedCommunityId || undefined}
          disabled={isUpdating}
        >
          <SelectTrigger className="liquid-glass-input w-full md:w-1/2">
            <SelectValue placeholder={t('selector.placeholder')} />
          </SelectTrigger>
          <SelectContent className="liquid-glass-nav">
            {adminCommunities.map((community) => (
              <SelectItem key={community.id} value={community.id}>
                {community.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </GlassCard>
    );
  }
);

CommunitySelector.displayName = "CommunitySelector";

export default CommunitySelector;
