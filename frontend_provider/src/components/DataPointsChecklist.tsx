/**
 * DataPointsChecklist Component
 * 
 * Displays provider-specific data points with:
 * - Required vs Optional distinction
 * - Smart validation
 * - Date range suggestions
 * - Conditional rendering based on field types
 * - Real-time validation feedback
 */

import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Info, Check } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

// Types matching backend providers.py structure
export interface DataPoint {
  field_name: string;
  display_name: string;
  required: boolean;
  field_type: 'TEXT' | 'DATE' | 'DATE_RANGE' | 'NUMBER' | 'BOOLEAN' | 'FILE';
  description: string;
  default_value?: string;
  validation_rule?: string;
  help_text?: string;
}

export interface RequestTypeCapability {
  request_type: string;
  display_name: string;
  integration_type: string;
  sla_hours: number;
  required_documents: string[];
  auto_fillable: boolean;
  description: string;
  typical_response_format: string;
  data_points: DataPoint[];
  estimated_cost?: number;
}

interface DataPointsChecklistProps {
  capability: RequestTypeCapability;
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
  fraudDate?: string; // For smart date suggestions
  errors?: Record<string, string>;
}

const DataPointsChecklist: React.FC<DataPointsChecklistProps> = ({
  capability,
  values,
  onChange,
  fraudDate,
  errors = {},
}) => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Validate field value based on validation rule
  const validateField = (dataPoint: DataPoint, value: any): string | null => {
    // Required field validation
    if (dataPoint.required && (!value || value === '')) {
      return 'This field is required';
    }

    // Skip validation if field is empty and not required
    if (!value || value === '') {
      return null;
    }

    // Regex validation
    if (dataPoint.validation_rule && dataPoint.field_type === 'TEXT') {
      try {
        const regex = new RegExp(dataPoint.validation_rule);
        if (!regex.test(value)) {
          return `Invalid format. ${dataPoint.help_text || ''}`;
        }
      } catch (e) {
        console.error('Invalid regex:', dataPoint.validation_rule);
      }
    }

    // Number validation
    if (dataPoint.field_type === 'NUMBER') {
      if (isNaN(Number(value))) {
        return 'Must be a valid number';
      }
    }

    return null;
  };

  // Handle field blur to show validation
  const handleBlur = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
    const dataPoint = capability.data_points.find(dp => dp.field_name === field);
    if (dataPoint) {
      const error = validateField(dataPoint, values[field]);
      setValidationErrors(prev => ({ ...prev, [field]: error || '' }));
    }
  };

  // Get smart date suggestion based on fraud date
  const getSuggestedDateRange = (): { from: string; to: string } | null => {
    if (!fraudDate) return null;

    const fraudDateObj = new Date(fraudDate);
    const from = format(subDays(fraudDateObj, 7), 'yyyy-MM-dd');
    const to = format(addDays(fraudDateObj, 7), 'yyyy-MM-dd');

    return { from, to };
  };

  // Auto-fill default values on mount
  useEffect(() => {
    capability.data_points.forEach(dp => {
      if (dp.default_value && !values[dp.field_name]) {
        onChange(dp.field_name, dp.default_value === 'true' ? true : dp.default_value === 'false' ? false : dp.default_value);
      }
    });
  }, [capability.data_points]);

  // Render field based on type
  const renderField = (dataPoint: DataPoint) => {
    const value = values[dataPoint.field_name];
    const error = (touchedFields.has(dataPoint.field_name) ? validationErrors[dataPoint.field_name] : '') || errors[dataPoint.field_name];
    const fieldId = `field-${dataPoint.field_name}`;

    switch (dataPoint.field_type) {
      case 'BOOLEAN':
        return (
          <div className="flex items-start gap-3">
            <div className="flex items-center h-6">
              <input
                type="checkbox"
                id={fieldId}
                checked={value || false}
                onChange={(e) => onChange(dataPoint.field_name, e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
              />
            </div>
            <div className="flex-1">
              <label htmlFor={fieldId} className="flex items-center gap-2 text-sm font-medium text-slate-200 cursor-pointer">
                {dataPoint.display_name}
                {!dataPoint.required && (
                  <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                )}
              </label>
              <p className="mt-1 text-xs text-slate-400">{dataPoint.description}</p>
              {dataPoint.help_text && (
                <div className="mt-1 flex items-start gap-1 text-xs text-blue-400">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{dataPoint.help_text}</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'DATE_RANGE':
        const suggestedRange = getSuggestedDateRange();
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              {dataPoint.display_name}
              {dataPoint.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <p className="text-xs text-slate-400">{dataPoint.description}</p>

            {suggestedRange && !value?.from && !value?.to && (
              <button
                type="button"
                onClick={() => onChange(dataPoint.field_name, suggestedRange)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2"
              >
                <Calendar className="w-3 h-3" />
                Use suggested range: {suggestedRange.from} to {suggestedRange.to} (±7 days from fraud)
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={value?.from || ''}
                  onChange={(e) => onChange(dataPoint.field_name, { ...value, from: e.target.value })}
                  onBlur={() => handleBlur(dataPoint.field_name)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={value?.to || ''}
                  onChange={(e) => onChange(dataPoint.field_name, { ...value, to: e.target.value })}
                  onBlur={() => handleBlur(dataPoint.field_name)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {dataPoint.help_text && (
              <div className="flex items-start gap-1 text-xs text-blue-400 mt-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{dataPoint.help_text}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-1 text-xs text-red-400 mt-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        );

      case 'NUMBER':
        return (
          <div className="space-y-2">
            <label htmlFor={fieldId} className="block text-sm font-medium text-slate-200">
              {dataPoint.display_name}
              {dataPoint.required && <span className="text-red-400 ml-1">*</span>}
              {!dataPoint.required && (
                <span className="text-xs text-slate-400 font-normal ml-2">(Optional)</span>
              )}
            </label>
            <p className="text-xs text-slate-400">{dataPoint.description}</p>
            <input
              type="number"
              id={fieldId}
              value={value || ''}
              onChange={(e) => onChange(dataPoint.field_name, e.target.value)}
              onBlur={() => handleBlur(dataPoint.field_name)}
              placeholder={dataPoint.help_text || ''}
              className={`w-full px-3 py-2 bg-slate-700 border ${
                error ? 'border-red-500' : 'border-slate-600'
              } rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            {error && (
              <div className="flex items-start gap-1 text-xs text-red-400">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        );

      case 'TEXT':
      default:
        return (
          <div className="space-y-2">
            <label htmlFor={fieldId} className="block text-sm font-medium text-slate-200">
              {dataPoint.display_name}
              {dataPoint.required && <span className="text-red-400 ml-1">*</span>}
              {!dataPoint.required && (
                <span className="text-xs text-slate-400 font-normal ml-2">(Optional)</span>
              )}
            </label>
            <p className="text-xs text-slate-400">{dataPoint.description}</p>
            <input
              type="text"
              id={fieldId}
              value={value || ''}
              onChange={(e) => onChange(dataPoint.field_name, e.target.value)}
              onBlur={() => handleBlur(dataPoint.field_name)}
              placeholder={dataPoint.help_text || ''}
              className={`w-full px-3 py-2 bg-slate-700 border ${
                error ? 'border-red-500' : 'border-slate-600'
              } rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            {dataPoint.help_text && !error && (
              <div className="flex items-start gap-1 text-xs text-slate-400">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{dataPoint.help_text}</span>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-1 text-xs text-red-400">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        );
    }
  };

  // Group data points: required first, then optional
  const requiredDataPoints = capability.data_points.filter(dp => dp.required);
  const optionalDataPoints = capability.data_points.filter(dp => !dp.required);

  return (
    <div className="space-y-6">
      {/* Provider Capability Header */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h3 className="text-base font-semibold text-slate-100">{capability.display_name}</h3>
            <p className="text-sm text-slate-400 mt-1">{capability.description}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-slate-400">SLA</div>
            <div className="text-sm font-semibold text-blue-400">{capability.sla_hours}h</div>
          </div>
        </div>

        {/* Capability Metadata */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className={`w-2 h-2 rounded-full ${
              capability.auto_fillable ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            {capability.auto_fillable ? 'Auto-fillable' : 'Manual'}
          </div>
          <div className="text-xs text-slate-400">
            Format: <span className="text-slate-300">{capability.typical_response_format}</span>
          </div>
          <div className="text-xs text-slate-400">
            Integration: <span className="text-slate-300">{capability.integration_type}</span>
          </div>
        </div>
      </div>

      {/* Required Data Points */}
      {requiredDataPoints.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 bg-red-500/20 rounded">
              <span className="text-xs font-bold text-red-400">*</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-200">Required Information</h4>
          </div>
          <div className="space-y-4 pl-7">
            {requiredDataPoints.map((dataPoint) => (
              <div key={dataPoint.field_name} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                {renderField(dataPoint)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional Data Points */}
      {optionalDataPoints.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 bg-slate-600/30 rounded">
              <Info className="w-3 h-3 text-slate-400" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">Optional Information</h4>
            <span className="text-xs text-slate-500">(Helps narrow results)</span>
          </div>
          <div className="space-y-4 pl-7">
            {optionalDataPoints.map((dataPoint) => (
              <div key={dataPoint.field_name} className="bg-slate-800/20 border border-slate-700/30 rounded-lg p-4">
                {renderField(dataPoint)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Summary */}
      {Object.keys(validationErrors).filter(k => validationErrors[k]).length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-red-300 mb-1">Please fix validation errors</div>
              <ul className="text-xs text-red-400 space-y-1">
                {Object.entries(validationErrors)
                  .filter(([_, err]) => err)
                  .map(([field, error]) => (
                    <li key={field}>
                      <strong>{capability.data_points.find(dp => dp.field_name === field)?.display_name}:</strong> {error}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataPointsChecklist;

