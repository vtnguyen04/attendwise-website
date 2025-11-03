import React from 'react';
import { 
  ResponsiveContainer as RechartsResponsiveContainer,
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid as RechartsCartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from 'recharts';

export function ResponsiveContainer(props: Omit<React.ComponentProps<typeof RechartsResponsiveContainer>, 'ref'> & { children?: React.ReactNode }) {
  return <RechartsResponsiveContainer {...props} />;
}

export function LineChart(props: Omit<React.ComponentProps<typeof RechartsLineChart>, 'ref'>) {
  return <RechartsLineChart {...props} />;
}

export function Line(props: Omit<React.ComponentProps<typeof RechartsLine>, 'ref'>) {
  return <RechartsLine {...props} />;
}

export function XAxis(props: Omit<React.ComponentProps<typeof RechartsXAxis>, 'ref'>) {
  return <RechartsXAxis {...props} />;
}

export function YAxis(props: Omit<React.ComponentProps<typeof RechartsYAxis>, 'ref'>) {
  return <RechartsYAxis {...props} />;
}

export function CartesianGrid(props: Omit<React.ComponentProps<typeof RechartsCartesianGrid>, 'ref'>) {
  return <RechartsCartesianGrid {...props} />;
}

export function Tooltip(props: Omit<React.ComponentProps<typeof RechartsTooltip>, 'ref'>) {
  return <RechartsTooltip {...props} />;
}

export function Legend(props: Omit<React.ComponentProps<typeof RechartsLegend>, 'ref'>) {
  return <RechartsLegend {...props} />;
}
