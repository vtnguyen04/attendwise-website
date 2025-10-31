'use client';

import dynamic from 'next/dynamic';

const DynamicResponsiveContainer = dynamic(() => import('@/components/analytics/recharts-wrappers').then(mod => mod.ResponsiveContainer), { ssr: false });
const DynamicLineChart = dynamic(() => import('@/components/analytics/recharts-wrappers').then(mod => mod.LineChart), { ssr: false });
const DynamicLine = dynamic(() => import('@/components/analytics/recharts-wrappers').then(mod => mod.Line), { ssr: false });
const DynamicXAxis = dynamic(() => import('@/components/analytics/recharts-wrappers').then(mod => mod.XAxis), { ssr: false });
const DynamicYAxis = dynamic(() => import('@/components/analytics/recharts-wrappers').then(mod => mod.YAxis), { ssr: false });
const DynamicCartesianGrid = dynamic(() => import('@/components/analytics/recharts-wrappers').then(mod => mod.CartesianGrid), { ssr: false });
const DynamicTooltip = dynamic(() => import('@/components/analytics/recharts-wrappers').then(mod => mod.Tooltip), { ssr: false });
const DynamicLegend = dynamic(() => import('@/components/analytics/recharts-wrappers').then(mod => mod.Legend), { ssr: false });


// Mock data for the chart
const generateMockData = () => {
  const data = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      "New Users": Math.floor(Math.random() * 50) + 20,
      "New Events": Math.floor(Math.random() * 10) + 5,
    });
  }
  return data;
};

const mockData = generateMockData();

// Custom Tooltip Component
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-4 bg-background/80 backdrop-blur-sm border rounded-lg shadow-lg">
        <p className="label font-bold text-foreground">{label}</p>
        {payload.map((pld, index) => (
          <p key={index} style={{ color: pld.color }}>{`${pld.name}: ${pld.value}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function TrendChartContent() {
  return (
    <DynamicResponsiveContainer width="100%" height={300}>
      <DynamicLineChart data={mockData}>
        <defs>
          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
          </linearGradient>
        </defs>
        <DynamicCartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} />
        <DynamicXAxis
          dataKey="date"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <DynamicYAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <DynamicTooltip content={<CustomTooltip />} />
        <DynamicLegend />
        <DynamicLine
          type="monotone"
          dataKey="New Users"
          stroke="url(#colorUsers)"
          strokeWidth={2}
          dot={false}
        />
        <DynamicLine
          type="monotone"
          dataKey="New Events"
          stroke="url(#colorEvents)"
          strokeWidth={2}
          dot={false}
        />
      </DynamicLineChart>
    </DynamicResponsiveContainer>
  );
}
