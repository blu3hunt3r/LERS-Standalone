/**
 * TASK 2.2.1: Telecom Module - Types and Interfaces
 */

export interface CDRRecord {
  callDate: string;
  callTime: string;
  callingNumber: string;
  calledNumber: string;
  callType: 'incoming' | 'outgoing' | 'missed';
  duration: number; // seconds
  cellId?: string;
  lat?: number;
  lng?: number;
  imei?: string;
  imsi?: string;
}

export interface CDRData {
  phoneNumber: string;
  operator: string;
  startDate: string;
  endDate: string;
  records: CDRRecord[];
}

export interface ContactNode {
  phoneNumber: string;
  callCount: number;
  totalDuration: number;
  avgDuration: number;
  firstCall: string;
  lastCall: string;
  callTypes: {
    incoming: number;
    outgoing: number;
    missed: number;
  };
}

export interface NightStayLocation {
  cellId: string;
  lat: number;
  lng: number;
  address?: string;
  frequency: number; // nights stayed
  percentage: number;
  dates: string[];
}

export interface MovementPattern {
  timestamp: string;
  cellId: string;
  lat: number;
  lng: number;
  address?: string;
}

export interface CoLocationEvent {
  phone1: string;
  phone2: string;
  cellId: string;
  lat: number;
  lng: number;
  timestamp: string;
  duration: number; // minutes
}

export interface CallPattern {
  hourlyDistribution: number[]; // 24 hours
  dayOfWeekDistribution: number[]; // 7 days
  peakHours: number[];
  avgCallsPerDay: number;
  avgCallDuration: number;
  nightActivity: number; // percentage
  weekendActivity: number; // percentage
}

export interface OTPMessage {
  timestamp: string;
  from: string;
  message: string;
  otp: string;
  service: string; // Bank, Amazon, etc.
}

