

export type View = 'DASHBOARD' | 'WEATHER' | 'PRICES' | 'DIAGNOSIS' | 'MARKETPLACE' | 'ADVISORY' | 'FORUM' | 'RENTAL' | 'WALLET' | 'ADMIN' | 'ORDERS' | 'PROFILE' | 'OFFLINE_GUIDE';

export type NotificationType = 'weather' | 'price' | 'market' | 'pest' | 'auth' | 'rental' | 'wallet' | 'offline' | 'advisory';

export interface OfflineTip {
  id: string;
  title: string;
  category: 'pest' | 'soil' | 'storage' | 'weather' | 'contacts' | 'advisory' | 'general';
  content: string;
  crop?: Crop | string;
  isCustom?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  tags?: string[];
}

export interface CachedDataWrapper<T> {
  data: T;
  sources?: GroundingSource[];
  timestamp: number;
  formattedDate: string;
  region?: string;
}

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  view?: View;
  region?: string;
  severity?: 'info' | 'warning' | 'critical';
  timestamp?: number;
  isPush?: boolean;
}

export type GhanaRegion = 
  | 'Greater Accra'
  | 'Ashanti'
  | 'Eastern'
  | 'Central'
  | 'Western'
  | 'Volta'
  | 'Bono / Techiman'
  | 'Northern / Tamale'
  | 'Upper East'
  | 'Upper West'
  | 'Southern Coastal'
  | 'Middle Forest'
  | 'Northern Savannah'
  | 'All Regions';

export interface UserNotificationPreferences {
  user_id?: string;
  region: string;
  push_enabled: boolean;
  weather_alerts_enabled: boolean;
  price_alerts_enabled: boolean;
  price_threshold_pct: number;
  sound_enabled: boolean;
  updated_at?: string;
}

export interface RegionalAlert {
  id?: string | number;
  type: 'weather' | 'price' | 'general';
  region: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  created_at?: string;
  created_by?: string;
}

export interface UserActivityLog {
  id: string | number;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_type?: 'farmer' | 'buyer' | 'seller' | 'admin' | string;
  action: string;
  details: string;
  region?: string;
  ip_address?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface WeatherForecast {
  day: string;
  date?: string; // YYYY-MM-DD or formatted date
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Stormy';
  temp: number; // in Celsius (current or avg)
  temp_min?: number; // min temperature in Celsius
  temp_max?: number; // max temperature in Celsius
  rainfall_mm?: number; // expected rainfall in mm
  precipitation_probability?: number; // 0 - 100%
  wind: number; // in km/h
  humidity: string;
  visibility: string;
  pressure: string;
  region?: string;
  agromet_note?: string; // Brief agricultural advisory
  planting_suitability?: 'Optimal' | 'Caution' | 'Unfavorable' | 'Good for Sowing' | 'Good for Spraying';
}

export enum Crop {
  Maize = 'Maize',
  Cassava = 'Cassava',
  Yam = 'Yam',
  Cocoa = 'Cocoa',
  Rice = 'Rice',
  Tomato = 'Tomato',
  Pepper = 'Pepper',
  Okro = 'Okro',
  Eggplant = 'Eggplant (Garden Eggs)',
  Plantain = 'Plantain',
  Banana = 'Banana',
  KpakpoShito = 'Kpakpo Shito (Pepper)',
  Onion = 'Onion',
  Orange = 'Orange',
  Ginger = 'Ginger',
  Sorghum = 'Sorghum',
  Soyabean = 'Soyabean',
  Millet = 'Millet'
}

export enum Market {
  Accra = 'Agbogbloshie, Accra',
  Kumasi = 'Central Market, Kumasi',
  Tamale = 'Central Market, Tamale',
  Takoradi = 'Market Circle, Takoradi',
  Techiman = 'Techiman Market',
  Hohoe = 'Hohoe Market',
  Ho = 'Ho Central Market',
  Kpando = 'Kpando Market',
  Keta = 'Keta Market',
  Sambu = 'Sambu Market',
  Kokomba = 'Kokomba Market',
}

export interface PriceData {
  market: string;
  price: number; // in GHS
  unit?: string; // e.g. "100kg bag"
  date?: string; // Date of the data
  trend?: 'up' | 'down' | 'stable';
}

export interface MarketplaceItem {
  id: string;
  name: string;
  category: 'Seeds' | 'Fertilizers' | 'Tools' | 'Produce';
  seller: string;
  price: number; // in GHS
  image_urls?: string[]; // snake_case
  usage_instructions?: string; // snake_case
  storage_recommendations?: string; // snake_case
  seller_email?: string; // snake_case
  seller_phone?: string; // snake_case
  seller_id?: string; // snake_case
  created_at?: string; // snake_case
  reviews?: Review[];
  likes?: number; // Total likes
  userHasLiked?: boolean; // If current user liked it (Derived on frontend)
}

export interface Review {
  id: number;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface SellerOrder {
    id: string;
    buyerName: string;
    itemName: string;
    quantity: number;
    total: number;
    date: string;
    status: 'Pending' | 'Shipped' | 'Delivered';
    seller_id?: string;
    buyer_id?: string;
    created_at?: string;
}

export interface AdvisoryStage {
    stage: string;
    timeline: string;
    instructions: string[];
}

export interface ForumReply {
    id: number;
    author: string;
    created_at: string; // snake_case
    content: string;
    image_url?: string; // snake_case
    images?: string[]; // Support multiple images
}

export interface ForumPost {
    id: number;
    author: string;
    created_at: string; // snake_case
    title: string;
    content: string;
    replies: ForumReply[];
    image_url?: string; // snake_case
    images?: string[]; // Support multiple images
}

export type MessageSender = 'user' | 'seller';

export interface Message {
  id: number;
  sender: MessageSender;
  text: string;
  timestamp: string;
}

export interface User {
  uid?: string;
  name: string;
  email: string;
  phone?: string;
  type: 'buyer' | 'seller' | 'farmer' | 'admin';
  merchant_id?: string; // snake_case
  photo_url?: string; // snake_case
  photo_storage_path?: string; // snake_case
}

export enum EquipmentType {
  Tractor = 'Tractor',
  Plow = 'Plow',
  Harvester = 'Harvester',
  Sprayer = 'Sprayer',
  Other = 'Other'
}

export interface EquipmentItem {
  id: string;
  name: string;
  type: EquipmentType;
  owner: string;
  location: string;
  price_per_day: number; // snake_case
  image_url: string; // snake_case
  available: boolean;
  description: string;
  owner_email?: string; // snake_case
  owner_phone?: string; // snake_case
  owner_id?: string; // snake_case
  created_at?: string; // snake_case
}

export interface Order {
  id: string;
  date: string;
  items: string[];
  total: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  payment_status?: 'escrowed' | 'pending_verification' | 'released' | 'refunded';
  handover_code?: string;
  seller_id?: string;
  buyer_id?: string;
}

export interface HandoverQualityCheck {
  produce_condition: 'Fresh / Grade A' | 'Good / Grade B' | 'Fair / Acceptable' | 'Damaged / Rejected';
  quantity_verified: boolean;
  packaging_intact: boolean;
  notes?: string;
}

export interface ProduceTransactionHandover {
  id: string;
  order_id: string;
  verification_code: string;
  buyer_id?: string;
  buyer_name: string;
  buyer_phone?: string;
  seller_id?: string;
  seller_name: string;
  seller_phone?: string;
  item_name: string;
  quantity: string | number;
  unit?: string;
  total_amount: number;
  currency: 'GHS';
  payment_method: 'Mobile Money (MTN/Telecel/AirtelTigo)' | 'Digital Escrow' | 'Cash on Delivery';
  payment_status: 'escrowed' | 'pending_verification' | 'released' | 'refunded';
  fulfillment_status: 'awaiting_handover' | 'in_transit' | 'verified_and_delivered' | 'disputed';
  handover_checkpoint: string;
  region: GhanaRegion | string;
  verified_at?: string;
  verified_by_user_id?: string;
  verified_by_role?: 'farmer' | 'buyer' | 'admin' | 'logistics_agent';
  handover_notes?: string;
  quality_check?: HandoverQualityCheck;
  digital_signature_hash?: string;
  created_at: string;
}

export interface OrderStatus {
    status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
    color: string;
}

export interface UserFile {
  id: string;
  user_id: string; // snake_case
  download_url: string; // snake_case
  storage_path: string; // snake_case
  file_name: string; // snake_case
  file_type: string; // snake_case
  context: 'profile' | 'pest-diagnosis' | 'marketplace' | 'rental' | 'forum' | 'admin-logo';
  ai_summary?: string; // snake_case
  notes?: string;
  created_at: string; // snake_case
}

export interface Inquiry {
    id?: number;
    user_id?: string;
    item_id?: string;
    item_type?: 'marketplace' | 'equipment';
    name: string;
    email: string;
    phone: string;
    message: string;
    status?: 'pending' | 'reviewed' | 'resolved';
    created_at?: string;
}

export interface GroundingSource {
    title: string;
    uri: string;
}

export interface ServiceResponse<T> {
    data: T;
    sources: GroundingSource[];
}
