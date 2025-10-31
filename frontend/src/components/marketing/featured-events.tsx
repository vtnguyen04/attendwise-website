import { EventItem } from "@/lib/types";
import EventListCard from "@/components/events/event-list-card";
import { adaptEventListData } from "@/lib/adapters/event-list.adapter";

const FeaturedEvents = ({ events }: { events: EventItem[] }) => {
  const displayEvents = adaptEventListData(events, 'event');

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {displayEvents.map((event) => (
        <EventListCard key={event.id} event={event} />
      ))}
    </div>
  );
};

export default FeaturedEvents;