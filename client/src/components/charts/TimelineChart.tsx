import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TimelineChartProps {
  // The expressions object is expected to have keys like 'neutral', 'happy', etc.
  // Each value is a tuple of [startTime, endTime]
  expressions: Record<string, [number, number]>;
}

const TimelineChart: React.FC<TimelineChartProps> = ({ expressions }) => {
  // Transform the expressions object into an array where each item has:
  // - expression: the expression name (e.g., 'neutral')
  // - startGap: the starting time (used as a transparent bar to offset)
  // - duration: the duration (endTime - startTime) which will be shown as the colored bar.
  // - end: the end time (for computing the domain)
  const data = Object.entries(expressions).map(([expression, [start, end]]) => ({
    expression,
    startGap: start,
    duration: end - start,
    end,
  }));

  // Compute maximum time to set the XAxis domain (if no data, default to 0)
  const maxTime = data.length > 0 ? Math.max(...data.map((d) => d.end)) : 0;

  return (
    <ResponsiveContainer width="100%" height={data.length * 60}>
      <BarChart data={data} layout="vertical" margin={{ left: 100, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          domain={[0, maxTime]}
          label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }}
        />
        <YAxis type="category" dataKey="expression" />
        <Tooltip />
        {/* Transparent Bar to offset the duration bar to its start time */}
        <Bar dataKey="startGap" stackId="a" fill="transparent" />
        {/* The actual duration bar */}
        <Bar dataKey="duration" stackId="a" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TimelineChart;
