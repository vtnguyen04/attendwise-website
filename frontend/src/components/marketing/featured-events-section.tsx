import { Section } from "./section";

export const FeaturedEventsSection = ({ children }: { children: React.ReactNode }) => {
  return (
    <Section
      title="Upcoming Events"
      description="Check out some of the upcoming events from our communities."
    >
      {children}
    </Section>
  );
};