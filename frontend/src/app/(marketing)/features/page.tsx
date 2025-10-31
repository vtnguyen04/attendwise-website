import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BarChart3 from 'lucide-react/icons/bar-chart-3';
import Building from 'lucide-react/icons/building';
import CalendarDays from 'lucide-react/icons/calendar-days';
import QrCode from 'lucide-react/icons/qr-code';
import ScanFace from 'lucide-react/icons/scan-face';
import Users from 'lucide-react/icons/users';
import Image from 'next/image';

const features = [
  {
    icon: CalendarDays,
    title: 'Event Management',
    description: 'Create, customize, and manage public or private events with ease. Set ticket prices, manage attendees, and track performance all in one place.',
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxldmVudCUyMG1hbmFnZW1lbnR8ZW58MHx8fHwxNzU5ODk0Njc3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    imageHint: 'event management',
  },
  {
    icon: QrCode,
    title: 'QR Code Check-in',
    description: 'Enable fast and seamless entry for your attendees. Generate unique QR codes for each participant and scan them at the door for instant verification.',
    image: 'https://images.unsplash.com/photo-1593431107204-43c223a3e970?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxRUiUyMGNvZGUlMjBzY2FufGVufDB8fHx8MTc1OTg5NDc0N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    imageHint: 'QR code scan',
  },
  {
    icon: ScanFace,
    title: 'Face ID Verification (AI)',
    description: 'Leverage the power of AI for secure, touchless check-in. Our system matches an attendee\'s live photo with their profile picture for robust identity verification.',
    image: 'https://images.unsplash.com/photo-1614036128247-2349d9d3fe2b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxmYWNpYWwlMjByZWNvZ25pdGlvbnxlbnwwfHx8fDE3NTk4OTQ4MDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    imageHint: 'facial recognition',
  },
  {
    icon: Building,
    title: 'Community Management',
    description: 'Build vibrant communities around your events or topics. Host discussions, share resources, and keep your members engaged before, during, and after events.',
    image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBlbmdhZ2VtZW50fGVufDB8fHx8MTc1OTg5NDg5MXww&ixlib=rb-4.1.0&q=80&w=1080',
    imageHint: 'community engagement',
  },
  {
    icon: Users,
    title: 'Live Event Interaction',
    description: 'Engage your audience during live online events with integrated Chat, Q&A, and Polls. Create an interactive and dynamic virtual experience.',
    image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw1fHxsaXZlJTIwd2ViaW5hcnxlbnwwfHx8fDE3NTk4OTQ5NDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    imageHint: 'live webinar',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Gain valuable insights into your events. Track registrations, monitor check-in rates in real-time, and analyze attendee engagement to measure your success.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxkYXNoYm9hcmQlMjBhbmFseXRpY3N8ZW58MHx8fHwxNzU5ODk1MDMxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    imageHint: 'dashboard analytics',
  },
];
export default function FeaturesPage() {
  return (
    <>
      {/* Hero Section - Giữ nguyên */}
      <section className="relative w-full pt-20 pb-16 md:pt-32 md:pb-24 text-center">
         <div className="absolute inset-0 z-0 opacity-10">
            <Image
                src="https://images.unsplash.com/photo-1531058020387-3be344556be6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxldmVudHxlbnwwfHx8fDE3NTkxNTQwNTd8MA&ixlib-rb-4.1.0&q=80&w=1920"
                alt="Features background"
                fill
                className="object-cover"
                data-ai-hint="event"
            />
             <div className="absolute inset-0 bg-background/80" />
          </div>
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-foreground">
            A Powerful Platform for Modern Events
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            AttendWise provides a comprehensive suite of tools to elevate your events, from seamless check-ins to deep analytics.
          </p>
        </div>
      </section>

      {/* Features Grid - Giữ nguyên */}
      <section className="py-16 md:py-24 bg-background/40">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="flex flex-col overflow-hidden transition-all duration-300 hover:border-primary hover:shadow-2xl hover:-translate-y-2">
                <CardHeader className="p-0">
                    <Image src={feature.image} alt={feature.title} width={600} height={350} className='aspect-[16/9] object-cover' data-ai-hint={feature.imageHint} />
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className='flex items-center gap-3 mb-3'>
                    <feature.icon className="h-7 w-7 text-primary" />
                    <CardTitle className='text-xl'>{feature.title}</CardTitle>
                  </div>
                  <p className="text-muted-foreground text-sm flex-1">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}