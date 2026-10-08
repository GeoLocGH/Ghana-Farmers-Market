import { supabase } from './supabase';
import type { RegionalAlert, UserActivityLog } from '../types';

const ACTIVITY_STORAGE_KEY = 'agro_user_activity_logs';

// Helper to escape CSV cell content safely
export const escapeCsvValue = (val: any): string => {
  if (val === null || val === undefined) return '""';
  if (typeof val === 'object') {
    val = JSON.stringify(val);
  }
  const stringVal = String(val);
  // If string contains comma, quote, or newline, escape quotes and wrap in quotes
  if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return `"${stringVal}"`;
};

// Generates a downloadable CSV string and triggers the browser download
export const downloadCsvFile = (filename: string, headers: string[], rows: (string | number | undefined | null)[][]) => {
  const headerRow = headers.map(h => escapeCsvValue(h)).join(',');
  const dataRows = rows.map(row => row.map(cell => escapeCsvValue(cell)).join(','));
  // Prepend UTF-8 BOM so Excel opens special characters (like GHS, degree symbols) cleanly
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export Regional Alerts to CSV
export const exportRegionalAlertsToCSV = (alerts: RegionalAlert[], filenamePrefix = 'agro_regional_alerts') => {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${filenamePrefix}_${dateStr}.csv`;

  const headers = [
    'Alert ID',
    'Type',
    'Region',
    'Severity',
    'Title',
    'Message',
    'Metadata',
    'Created At',
    'Created By'
  ];

  const rows = alerts.map(alert => [
    alert.id || 'N/A',
    alert.type,
    alert.region,
    alert.severity,
    alert.title,
    alert.message,
    alert.metadata ? JSON.stringify(alert.metadata) : '',
    alert.created_at || new Date().toISOString(),
    alert.created_by || 'System Automated'
  ]);

  downloadCsvFile(filename, headers, rows);
};

// Export User Activity Logs to CSV
export const exportUserActivityLogsToCSV = (logs: UserActivityLog[], filenamePrefix = 'agro_user_activity_logs') => {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${filenamePrefix}_${dateStr}.csv`;

  const headers = [
    'Log ID',
    'Timestamp',
    'User ID',
    'User Name',
    'User Email',
    'User Role',
    'Action',
    'Region',
    'Details',
    'Metadata'
  ];

  const rows = logs.map(log => [
    log.id || 'N/A',
    log.created_at,
    log.user_id || 'Anonymous / Guest',
    log.user_name || 'N/A',
    log.user_email || 'N/A',
    log.user_type || 'farmer',
    log.action,
    log.region || 'All Regions',
    log.details,
    log.metadata ? JSON.stringify(log.metadata) : ''
  ]);

  downloadCsvFile(filename, headers, rows);
};

// Default seed logs for realistic Ghanaian farming activity preview
const DEFAULT_SEED_LOGS: UserActivityLog[] = [
  {
    id: 'log-101',
    user_id: 'usr-gh-001',
    user_name: 'Kofi Mensah',
    user_email: 'kofi.mensah@farmer.gh',
    user_type: 'farmer',
    action: 'PRICE_CHECK',
    details: 'Queried wholesale price for White Maize at Techiman Market',
    region: 'Bono / Techiman',
    metadata: { crop: 'Maize', market: 'Techiman', price: 260 },
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: 'log-102',
    user_id: 'usr-gh-002',
    user_name: 'Akua Afriyie',
    user_email: 'akua.afriyie@agrobuyer.gh',
    user_type: 'buyer',
    action: 'ORDER_PLACED',
    details: 'Initiated purchase of 50 bags of Yam (Pona) from Ejura Farms',
    region: 'Ashanti',
    metadata: { commodity: 'Yam', bags: 50, total_ghs: 18500 },
    created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString()
  },
  {
    id: 'log-103',
    user_id: 'usr-gh-003',
    user_name: 'Ibrahim Alhassan',
    user_email: 'i.alhassan@tamale-grain.com',
    user_type: 'seller',
    action: 'MARKET_LISTING_CREATED',
    details: 'Listed 200 bags of Northern Yellow Soyabean at GHS 320/bag',
    region: 'Northern / Tamale',
    metadata: { commodity: 'Soyabean', quantity: 200, unitPrice: 320 },
    created_at: new Date(Date.now() - 95 * 60 * 1000).toISOString()
  },
  {
    id: 'log-104',
    user_id: 'usr-gh-004',
    user_name: 'Kwame Osei',
    user_email: 'k.osei@oseifarms.com',
    user_type: 'farmer',
    action: 'WEATHER_ALERT_TRIGGERED',
    details: 'Received Severe Squall & Flash Flood Alert for Southern Coastal Belt',
    region: 'Southern Coastal',
    metadata: { windSpeed: '38 km/h', stormSeverity: 'critical' },
    created_at: new Date(Date.now() - 140 * 60 * 1000).toISOString()
  },
  {
    id: 'log-105',
    user_id: 'usr-gh-005',
    user_name: 'Esi Dadzie',
    user_email: 'esi.dadzie@centralproduce.gh',
    user_type: 'farmer',
    action: 'EQUIPMENT_RENTAL_INQUIRY',
    details: 'Booked 50HP John Deere Tractor for plowing at Kasoa farming cluster',
    region: 'Central',
    metadata: { equipment: 'Tractor 50HP', durationDays: 3, costGhs: 1200 },
    created_at: new Date(Date.now() - 210 * 60 * 1000).toISOString()
  },
  {
    id: 'log-106',
    user_id: 'usr-gh-006',
    user_name: 'Abena Mansa',
    user_email: 'abena.m@gmail.com',
    user_type: 'buyer',
    action: 'NOTIFICATION_PREFERENCE_UPDATE',
    details: 'Enabled push alerts for Ashanti wholesale tomato price fluctuations',
    region: 'Ashanti',
    metadata: { crop: 'Tomato', thresholdPct: 15 },
    created_at: new Date(Date.now() - 320 * 60 * 1000).toISOString()
  },
  {
    id: 'log-107',
    user_id: 'usr-admin-01',
    user_name: 'App Administrator',
    user_email: 'admin@agrosourcing.com',
    user_type: 'admin',
    action: 'ALERT_BROADCAST',
    details: 'Broadcast nationwide storm caution for coastal marine and lake fishermen/farmers',
    region: 'All Regions',
    metadata: { broadcastType: 'extreme_weather', severity: 'warning' },
    created_at: new Date(Date.now() - 480 * 60 * 1000).toISOString()
  }
];

// Log user activity in Supabase and locally
export const logUserActivity = async (entry: {
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_type?: string;
  action: string;
  details: string;
  region?: string;
  metadata?: Record<string, any>;
}): Promise<void> => {
  const newLog: UserActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: entry.user_id,
    user_name: entry.user_name,
    user_email: entry.user_email,
    user_type: entry.user_type || 'farmer',
    action: entry.action,
    details: entry.details,
    region: entry.region || 'All Regions',
    metadata: entry.metadata,
    created_at: new Date().toISOString()
  };

  // 1. Cache to local storage buffer
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const existing: UserActivityLog[] = raw ? JSON.parse(raw) : [];
    existing.unshift(newLog);
    // Keep last 200 logs locally
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(existing.slice(0, 200)));
  } catch (err) {
    console.warn("Could not cache user activity locally:", err);
  }

  // 2. Persist to Supabase if available
  try {
    const { error } = await supabase.from('user_activity_logs').insert([
      {
        user_id: entry.user_id || null,
        user_name: entry.user_name || null,
        user_email: entry.user_email || null,
        user_type: entry.user_type || 'farmer',
        action: entry.action,
        details: entry.details,
        region: entry.region || 'All Regions',
        metadata: entry.metadata || {},
        created_at: newLog.created_at
      }
    ]);
    if (error) {
      console.warn("Supabase user_activity_logs write notice (will rely on local buffer):", error.message);
    }
  } catch (err) {
    // Graceful fallback
  }
};

// Fetch all User Activity Logs
export const fetchUserActivityLogs = async (): Promise<UserActivityLog[]> => {
  try {
    const { data, error } = await supabase
      .from('user_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(150);

    if (!error && data && data.length > 0) {
      return data as UserActivityLog[];
    }
  } catch (err) {
    console.warn("Could not fetch remote user_activity_logs, using cached buffer:", err);
  }

  // Fallback to local storage + seed items
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const localLogs: UserActivityLog[] = raw ? JSON.parse(raw) : [];
    // Merge localLogs and DEFAULT_SEED_LOGS without duplicate IDs
    const merged = [...localLogs];
    DEFAULT_SEED_LOGS.forEach(seed => {
      if (!merged.some(m => m.id === seed.id)) {
        merged.push(seed);
      }
    });
    // Sort descending
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged;
  } catch {
    return DEFAULT_SEED_LOGS;
  }
};

// Fetch Regional Alert History
export const fetchRegionalAlerts = async (): Promise<RegionalAlert[]> => {
  try {
    const { data, error } = await supabase
      .from('regional_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(150);

    if (!error && data && data.length > 0) {
      return data as RegionalAlert[];
    }
  } catch (err) {
    console.warn("Could not fetch remote regional_alerts, using offline cache:", err);
  }

  // Fallback: Read from localStorage or default historical alerts
  try {
    const raw = localStorage.getItem('agro_alert_history');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          id: item.id || `alert-${idx}`,
          type: item.type || 'weather',
          region: item.region || 'All Regions',
          severity: item.urgent ? 'critical' : 'warning',
          title: item.title,
          message: item.message,
          created_at: new Date(item.timestamp || Date.now()).toISOString()
        }));
      }
    }
  } catch {}

  // Ghanaian agricultural alerts defaults
  return [
    {
      id: 'alt-gh-01',
      type: 'weather',
      region: 'Southern Coastal',
      severity: 'critical',
      title: 'Heavy Thunderstorm & Squall Warning',
      message: 'Ghana Meteorological Agency (GMet) warns of heavy convective storm cells moving across Greater Accra and Central coastal farmlands with gusts exceeding 35 km/h.',
      metadata: { source: 'GMet / MoFA', windSpeed: '38 km/h' },
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    },
    {
      id: 'alt-gh-02',
      type: 'price',
      region: 'Bono / Techiman',
      severity: 'warning',
      title: 'Maize Wholesale Price Surge (+18%)',
      message: 'Techiman Market recorded sharp demand increase: 100kg white maize bags climbed from GHS 220 to GHS 260 due to transit inflows.',
      metadata: { crop: 'Maize', market: 'Techiman Market', price: 260, previousPrice: 220, pct_change: 18.18 },
      created_at: new Date(Date.now() - 110 * 60 * 1000).toISOString()
    },
    {
      id: 'alt-gh-03',
      type: 'weather',
      region: 'Northern / Tamale',
      severity: 'warning',
      title: 'Prolonged Dry Spell & Heat Advisory',
      message: 'Temperatures peaking at 36°C with relative humidity below 30%. Farmers are advised to apply mulch and protect seedlings.',
      metadata: { source: 'Agro-Met Northern Sector', temp: 36 },
      created_at: new Date(Date.now() - 250 * 60 * 1000).toISOString()
    },
    {
      id: 'alt-gh-04',
      type: 'price',
      region: 'Ashanti',
      severity: 'warning',
      title: 'Tomato Supply Constriction & Price Jump (+25%)',
      message: 'Kumasi Central Market recorded wholesale crate increase from GHS 320 to GHS 400 due to transport bottleneck from Tuobodom.',
      metadata: { crop: 'Tomato', market: 'Central Market, Kumasi', price: 400, previousPrice: 320, pct_change: 25.0 },
      created_at: new Date(Date.now() - 360 * 60 * 1000).toISOString()
    },
    {
      id: 'alt-gh-05',
      type: 'general',
      region: 'All Regions',
      severity: 'info',
      title: 'MoFA Subsidized Fertilizer Distribution Phase 2',
      message: 'Ministry of Food and Agriculture commences phase 2 input distribution across registered district agricultural offices.',
      metadata: { ministry: 'MoFA', program: 'Planting for Food and Jobs' },
      created_at: new Date(Date.now() - 720 * 60 * 1000).toISOString()
    }
  ];
};
