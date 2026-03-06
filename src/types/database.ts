// ─────────────────────────────────────────────────────────────────────────────
// Database types — mirrors the Supabase schema exactly.
// Regenerate with: npx supabase gen types typescript --local > src/types/database.ts
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = "customer" | "vendor" | "admin";
export type VendorType = "service_center" | "parts_seller";
export type VendorStatus = "pending" | "approved" | "suspended" | "rejected";
export type BookingStatus =
  | "booked"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "waiting_parts"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";
export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled";

// ─────────────────────────────────────────────────────────────────────────────
// Row types (what Supabase returns)
// ─────────────────────────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface DbVendor {
  id: string;
  user_id: string;
  business_name: string;
  vendor_type: VendorType;
  status: VendorStatus;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  commercial_reg_no: string | null;
  tax_id: string | null;
  description: string | null;
  rating: number;
  total_reviews: number;
  completed_bookings: number;
  created_at: string;
  updated_at: string;
}

export interface DbVehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  engine_code: string | null;
  color: string | null;
  plate_number: string | null;
  mileage: number | null;
  is_default: boolean;
  created_at: string;
}

export interface DbService {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number | null;
  active: boolean;
  created_at: string;
}

export interface DbBooking {
  id: string;
  user_id: string;
  vendor_id: string;
  vehicle_id: string | null;
  service_id: string | null;
  booking_date: string;
  booking_time: string | null;
  status: BookingStatus;
  notes: string | null;
  total_price: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  user?: DbUser;
  vendor?: DbVendor;
  vehicle?: DbVehicle;
  service?: DbService;
  status_history?: DbBookingStatusHistory[];
}

export interface DbBookingStatusHistory {
  id: string;
  booking_id: string;
  status: BookingStatus;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface DbProduct {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string;
  subcategory: string | null;
  sku: string | null;
  oem_number: string | null;
  brand: string | null;
  condition: "new" | "used" | "refurbished";
  stock: number;
  image_url: string | null;
  images: string[];
  active: boolean;
  compatible_vehicles: string[];
  created_at: string;
  updated_at: string;
  // Joined
  vendor?: DbVendor;
}

export interface DbOrder {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  shipping_fee: number;
  discount: number;
  promo_code: string | null;
  delivery_name: string | null;
  delivery_phone: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  items?: DbOrderItem[];
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  vendor_id: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface DbVendorApplication {
  id: string;
  user_id: string | null;
  business_name: string;
  vendor_type: VendorType;
  owner_name: string;
  email: string;
  phone: string;
  city: string | null;
  address: string | null;
  commercial_reg_no: string | null;
  tax_id: string | null;
  description: string | null;
  step_completed: number;
  status: VendorStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Database generic type (for typed client)
// ─────────────────────────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          vendor_type: VendorType;
          status: VendorStatus;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          commercial_reg_no: string | null;
          tax_id: string | null;
          description: string | null;
          rating: number;
          total_reviews: number;
          completed_bookings: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          vendor_type: VendorType;
          status?: VendorStatus;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          commercial_reg_no?: string | null;
          tax_id?: string | null;
          description?: string | null;
          rating?: number;
          total_reviews?: number;
          completed_bookings?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_name?: string;
          vendor_type?: VendorType;
          status?: VendorStatus;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          commercial_reg_no?: string | null;
          tax_id?: string | null;
          description?: string | null;
          rating?: number;
          total_reviews?: number;
          completed_bookings?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          user_id: string;
          make: string;
          model: string;
          year: number;
          trim: string | null;
          engine_code: string | null;
          color: string | null;
          plate_number: string | null;
          mileage: number | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          make: string;
          model: string;
          year: number;
          trim?: string | null;
          engine_code?: string | null;
          color?: string | null;
          plate_number?: string | null;
          mileage?: number | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          make?: string;
          model?: string;
          year?: number;
          trim?: string | null;
          engine_code?: string | null;
          color?: string | null;
          plate_number?: string | null;
          mileage?: number | null;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          vendor_id: string;
          name: string;
          description: string | null;
          price: number;
          duration_minutes: number | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          name: string;
          description?: string | null;
          price: number;
          duration_minutes?: number | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          duration_minutes?: number | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          vendor_id: string;
          vehicle_id: string | null;
          service_id: string | null;
          booking_date: string;
          booking_time: string | null;
          status: BookingStatus;
          notes: string | null;
          total_price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vendor_id: string;
          vehicle_id?: string | null;
          service_id?: string | null;
          booking_date: string;
          booking_time?: string | null;
          status?: BookingStatus;
          notes?: string | null;
          total_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vendor_id?: string;
          vehicle_id?: string | null;
          service_id?: string | null;
          booking_date?: string;
          booking_time?: string | null;
          status?: BookingStatus;
          notes?: string | null;
          total_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      booking_status_history: {
        Row: {
          id: string;
          booking_id: string;
          status: BookingStatus;
          note: string | null;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          status: BookingStatus;
          note?: string | null;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          status?: BookingStatus;
          note?: string | null;
          changed_by?: string | null;
          changed_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          vendor_id: string;
          name: string;
          description: string | null;
          price: number;
          original_price: number | null;
          category: string;
          subcategory: string | null;
          sku: string | null;
          oem_number: string | null;
          brand: string | null;
          condition: string;
          stock: number;
          image_url: string | null;
          images: string[];
          active: boolean;
          compatible_vehicles: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          name: string;
          description?: string | null;
          price: number;
          original_price?: number | null;
          category: string;
          subcategory?: string | null;
          sku?: string | null;
          oem_number?: string | null;
          brand?: string | null;
          condition?: string;
          stock?: number;
          image_url?: string | null;
          images?: string[];
          active?: boolean;
          compatible_vehicles?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          original_price?: number | null;
          category?: string;
          subcategory?: string | null;
          sku?: string | null;
          oem_number?: string | null;
          brand?: string | null;
          condition?: string;
          stock?: number;
          image_url?: string | null;
          images?: string[];
          active?: boolean;
          compatible_vehicles?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          status: OrderStatus;
          total_amount: number;
          shipping_fee: number;
          discount: number;
          promo_code: string | null;
          delivery_name: string | null;
          delivery_phone: string | null;
          delivery_address: string | null;
          delivery_city: string | null;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: OrderStatus;
          total_amount: number;
          shipping_fee?: number;
          discount?: number;
          promo_code?: string | null;
          delivery_name?: string | null;
          delivery_phone?: string | null;
          delivery_address?: string | null;
          delivery_city?: string | null;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: OrderStatus;
          total_amount?: number;
          shipping_fee?: number;
          discount?: number;
          promo_code?: string | null;
          delivery_name?: string | null;
          delivery_phone?: string | null;
          delivery_address?: string | null;
          delivery_city?: string | null;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          vendor_id: string | null;
          name: string;
          sku: string | null;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          vendor_id?: string | null;
          name: string;
          sku?: string | null;
          quantity: number;
          unit_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          vendor_id?: string | null;
          name?: string;
          sku?: string | null;
          quantity?: number;
          unit_price?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      vendor_applications: {
        Row: {
          id: string;
          user_id: string | null;
          business_name: string;
          vendor_type: VendorType;
          owner_name: string;
          email: string;
          phone: string;
          city: string | null;
          address: string | null;
          commercial_reg_no: string | null;
          tax_id: string | null;
          description: string | null;
          step_completed: number;
          status: VendorStatus;
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          business_name: string;
          vendor_type: VendorType;
          owner_name: string;
          email: string;
          phone: string;
          city?: string | null;
          address?: string | null;
          commercial_reg_no?: string | null;
          tax_id?: string | null;
          description?: string | null;
          step_completed?: number;
          status?: VendorStatus;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          business_name?: string;
          vendor_type?: VendorType;
          owner_name?: string;
          email?: string;
          phone?: string;
          city?: string | null;
          address?: string | null;
          commercial_reg_no?: string | null;
          tax_id?: string | null;
          description?: string | null;
          step_completed?: number;
          status?: VendorStatus;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_my_vendor_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      vendor_type: VendorType;
      vendor_status: VendorStatus;
      booking_status: BookingStatus;
      order_status: OrderStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
