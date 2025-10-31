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

export function ResponsiveContainer(props: React.ComponentProps<typeof RechartsResponsiveContainer> & { children?: React.ReactNode }) {
  return <RechartsResponsiveContainer {...props} />;
}

export function LineChart(props: React.ComponentProps<typeof RechartsLineChart>) {
  return <RechartsLineChart {...props} />;
}

export function Line(props: React.ComponentProps<typeof RechartsLine>) {
  const { ref, ...rest } = props;
  return <RechartsLine {...rest} />;
}

export function XAxis(props: React.ComponentProps<typeof RechartsXAxis>) {
  return <RechartsXAxis {...props} />;
}

export function YAxis(props: React.ComponentProps<typeof RechartsYAxis>) {
  return <RechartsYAxis {...props} />;
}

export function CartesianGrid(props: React.ComponentProps<typeof RechartsCartesianGrid>) {
  return <RechartsCartesianGrid {...props} />;
}

export function Tooltip(props: React.ComponentProps<typeof RechartsTooltip>) {
  return <RechartsTooltip {...props} />;
}

export function Legend(props: React.ComponentProps<typeof RechartsLegend>) {
  const { ref, ...rest } = props;
  return <RechartsLegend {...rest} />;
}
