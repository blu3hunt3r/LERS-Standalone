/**
 * Pattern Analysis Component
 *
 * Analyzes transaction patterns to identify:
 * - Common transaction amounts
 * - Frequency analysis
 * - Temporal patterns (day/time)
 * - Geographic clustering
 */

import React, { useMemo } from 'react';
import { Clock, DollarSign, MapPin, Activity, Calendar } from 'lucide-react';

interface Link {
  id: string;
  source: string;
  target: string;
  label?: string;
  metadata?: {
    amount?: string | number;
    timestamp?: string;
    date?: string;
    time?: string;
    location?: string;
    [key: string]: any;
  };
}

interface PatternAnalysisProps {
  links: Link[];
}

export const PatternAnalysis: React.FC<PatternAnalysisProps> = ({ links }) => {
  const patterns = useMemo(() => {
    // Common transaction amounts (rounded to nearest $100)
    const amountFrequency = new Map<number, number>();
    const timestamps: Date[] = [];
    const locations = new Map<string, number>();
    const dayOfWeek = new Map<string, number>();
    const hourOfDay = new Map<number, number>();

    links.forEach(link => {
      // Amount analysis
      const amount = parseFloat(String(link.metadata?.amount || 0));
      if (!isNaN(amount) && amount > 0) {
        const rounded = Math.round(amount / 100) * 100;
        amountFrequency.set(rounded, (amountFrequency.get(rounded) || 0) + 1);
      }

      // Temporal analysis
      const dateStr = link.metadata?.timestamp || link.metadata?.date;
      if (dateStr) {
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            timestamps.push(date);

            // Day of week
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const day = days[date.getDay()];
            dayOfWeek.set(day, (dayOfWeek.get(day) || 0) + 1);

            // Hour of day
            const hour = date.getHours();
            hourOfDay.set(hour, (hourOfDay.get(hour) || 0) + 1);
          }
        } catch (e) {
          // Invalid date
        }
      }

      // Location analysis
      const location = link.metadata?.location;
      if (location) {
        locations.set(location, (locations.get(location) || 0) + 1);
      }
    });

    // Get top amounts
    const topAmounts = Array.from(amountFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Get top locations
    const topLocations = Array.from(locations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Calculate transaction velocity (transactions per day)
    const velocityByDay = new Map<string, number>();
    timestamps.forEach(date => {
      const dayKey = date.toISOString().split('T')[0];
      velocityByDay.set(dayKey, (velocityByDay.get(dayKey) || 0) + 1);
    });

    const avgTransactionsPerDay = velocityByDay.size > 0
      ? Array.from(velocityByDay.values()).reduce((a, b) => a + b, 0) / velocityByDay.size
      : 0;

    return {
      topAmounts,
      topLocations,
      dayOfWeek,
      hourOfDay,
      avgTransactionsPerDay,
      totalDays: velocityByDay.size,
      peakDay: Array.from(dayOfWeek.entries()).sort((a, b) => b[1] - a[1])[0],
      peakHour: Array.from(hourOfDay.entries()).sort((a, b) => b[1] - a[1])[0],
    };
  }, [links]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pattern Analysis</h2>
          <p className="text-sm text-gray-600 mt-1">Identify behavioral patterns and anomalies</p>
        </div>
        <Activity className="h-8 w-8 text-purple-600" />
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Transactions/Day</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {patterns.avgTransactionsPerDay.toFixed(1)}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Days</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{patterns.totalDays}</p>
            </div>
            <Clock className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Peak Day</p>
              <p className="text-lg font-bold text-gray-900 mt-2">
                {patterns.peakDay?.[0] || 'N/A'}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Peak Hour</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {patterns.peakHour?.[0] !== undefined ? `${patterns.peakHour[0]}:00` : 'N/A'}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Common Transaction Amounts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Common Transaction Amounts
          </h3>
          <div className="space-y-3">
            {patterns.topAmounts.length > 0 ? (
              patterns.topAmounts.map(([amount, count], index) => (
                <div key={amount} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{formatCurrency(amount)}</p>
                      <p className="text-xs text-gray-500">Approximate amount</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{count}x</p>
                    <p className="text-xs text-gray-500">occurrences</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No transaction data available</p>
            )}
          </div>
        </div>

        {/* Geographic Patterns */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            Geographic Patterns
          </h3>
          <div className="space-y-3">
            {patterns.topLocations.length > 0 ? (
              patterns.topLocations.map(([location, count], index) => (
                <div key={location} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{location}</p>
                      <p className="text-xs text-gray-500">Location</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{count}x</p>
                    <p className="text-xs text-gray-500">transactions</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No location data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Temporal Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day of Week Pattern */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            Day of Week Pattern
          </h3>
          <div className="space-y-2">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
              const count = patterns.dayOfWeek.get(day) || 0;
              const maxCount = Math.max(...Array.from(patterns.dayOfWeek.values()));
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

              return (
                <div key={day} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{day}</span>
                    <span className="text-gray-600">{count} transactions</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hour of Day Pattern */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Hour of Day Pattern
          </h3>
          <div className="space-y-1">
            {/* Create a simple bar chart for hours */}
            <div className="flex items-end justify-between h-40 gap-1">
              {Array.from({ length: 24 }, (_, hour) => {
                const count = patterns.hourOfDay.get(hour) || 0;
                const maxCount = Math.max(...Array.from(patterns.hourOfDay.values()));
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

                return (
                  <div key={hour} className="flex-1 flex flex-col items-center justify-end group relative">
                    <div
                      className="w-full bg-orange-500 rounded-t hover:bg-orange-600 transition-all cursor-pointer"
                      style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                      title={`${hour}:00 - ${count} transactions`}
                    ></div>
                    <span className="text-xs text-gray-500 mt-1 hidden group-hover:block absolute -bottom-6">
                      {hour}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-8">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternAnalysis;
