// ─────────────────────────────────────────────────────────────────────────────
// Database types — mirrors the Supabase schema exactly.
// Regenerate with: npx supabase gen types typescript --local > src/types/database.ts
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = "customer" | "vendor" | "admin" | "manager";
export type VendorType = "service_center" | "parts_seller";
export type VendorStatus = "pending" | "approved" | "suspended" | "rejected";
export type SlotOverrideType = "blocked" | "opened";
export type NotificationType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_status_changed"
  | "order_shipped"
  | "order_status_changed"
  | "order_processing"
  | "order_shipped_bosta"
  | "order_delivered"
  | "message_received"
  | "review_reply"
  | "vendor_approved"
  | "vendor_rejected"
  | "payout_request";
export type BookingStatus =
  | "booked"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "waiting_parts"
  | "ready_for_pickup"
  | "completed"
  | "cancelled"
  | "no_show";
export type BookingType = "routine_maintenance" | "inspection";
export type PartType = "oem" | "aftermarket" | "original";

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "failed_delivery";

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
  business_name_ar: string | null;
  vendor_type: VendorType;
  status: VendorStatus;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  city_ar: string | null;
  governorate: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  commercial_reg_no: string | null;
  tax_id: string | null;
  description: string | null;
  description_ar: string | null;
  rating: number;
  total_reviews: number;
  completed_bookings: number;
  specializations: string[];
  supported_makes: string[];
  /** ISO timestamp set when the vendor is first approved. Used for billing period calculation. */
  approved_at?: string | null;
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

export interface DbBranch {
  id: string;
  vendor_id: string;
  name: string;
  name_ar: string | null;
  address: string | null;
  city: string | null;
  city_ar: string | null;
  governorate: string | null;
  latitude: number | null;
  longitude: number | null;
  maps_link: string | null;
  phone: string | null;
  status: "active" | "inactive";
  is_main: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  vendor?: DbVendor;
}

export interface DbBranchWorkingHours {
  id: string;
  branch_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

export interface DbBranchSlotOverride {
  id: string;
  branch_id: string;
  date: string;
  time: string | null;
  type: "blocked" | "opened";
  note: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH USERS (manager assignments)
// ─────────────────────────────────────────────────────────────────────────────

export type BranchUserRole = "owner" | "manager";

export interface DbBranchUser {
  user_id: string;
  branch_id: string;
  role: BranchUserRole;
  assigned_by: string | null;
  created_at: string;
  // Joined
  user?: Pick<DbUser, "id" | "email" | "full_name" | "avatar_url">;
  branch?: Pick<DbBranch, "id" | "name" | "name_ar" | "vendor_id">;
}

export interface DbService {
  id: string;
  vendor_id: string;
  branch_id: string | null;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  price: number | null;
  duration_minutes: number | null;
  active: boolean;
  created_at: string;
  // Joined
  branch?: DbBranch;
}

export interface DbBooking {
  id: string;
  user_id: string;
  vendor_id: string;
  branch_id: string | null;
  vehicle_id: string | null;
  service_key: string | null;
  booking_date: string;
  booking_time: string | null;
  status: BookingStatus;
  booking_type: BookingType;
  mileage: number | null;
  notes: string | null;
  total_price: number | null;
  cancelled_by: "customer" | "vendor" | "admin" | null;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  user?: DbUser;
  vendor?: DbVendor;
  branch?: DbBranch;
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
  slug: string | null;
  vendor_id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string;
  subcategory: string | null;
  sku: string | null;
  oem_number: string | null;
  part_number: string | null;
  brand: string | null;
  condition: "new" | "used" | "refurbished";
  /** OEM = factory-spec, original = genuine from car brand, aftermarket = third-party */
  part_type: PartType | null;
  make: string | null;
  model: string | null;
  year_from: number | null;
  year_to: number | null;
  stock: number;
  image_url: string | null;
  images: string[];
  active: boolean;
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
          display_id: number;
          user_id: string;
          business_name: string;
          business_name_ar: string | null;
          vendor_type: VendorType;
          status: VendorStatus;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          city_ar: string | null;
          governorate: string | null;
          latitude: number | null;
          longitude: number | null;
          featured: boolean;
          featured_priority: number;
          logo_url: string | null;
          cover_image_url: string | null;
          commercial_reg_no: string | null;
          tax_id: string | null;
          description: string | null;
          description_ar: string | null;
          rating: number;
          total_reviews: number;
          completed_bookings: number;
          specializations: string[];
          supported_makes: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          business_name_ar?: string | null;
          vendor_type: VendorType;
          status?: VendorStatus;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          city_ar?: string | null;
          governorate?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          featured?: boolean;
          featured_priority?: number;
          logo_url?: string | null;
          cover_image_url?: string | null;
          commercial_reg_no?: string | null;
          tax_id?: string | null;
          description?: string | null;
          description_ar?: string | null;
          rating?: number;
          total_reviews?: number;
          completed_bookings?: number;
          specializations?: string[];
          supported_makes?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_name?: string;
          business_name_ar?: string | null;
          vendor_type?: VendorType;
          status?: VendorStatus;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          city_ar?: string | null;
          governorate?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          featured?: boolean;
          featured_priority?: number;
          logo_url?: string | null;
          cover_image_url?: string | null;
          commercial_reg_no?: string | null;
          tax_id?: string | null;
          description?: string | null;
          description_ar?: string | null;
          rating?: number;
          total_reviews?: number;
          completed_bookings?: number;
          specializations?: string[];
          supported_makes?: string[];
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
          name_ar: string | null;
          description: string | null;
          description_ar: string | null;
          price: number | null;
          duration_minutes: number | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          name: string;
          name_ar?: string | null;
          description?: string | null;
          description_ar?: string | null;
          price?: number | null;
          duration_minutes?: number | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          name?: string;
          name_ar?: string | null;
          description?: string | null;
          description_ar?: string | null;
          price?: number | null;
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
          service_key: string | null;
          booking_date: string;
          booking_time: string | null;
          status: BookingStatus;
          booking_type: BookingType;
          mileage: number | null;
          notes: string | null;
          total_price: number | null;
          branch_id: string | null;
          display_id: number | null;
          cancelled_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vendor_id: string;
          vehicle_id?: string | null;
          service_key?: string | null;
          booking_date: string;
          booking_time?: string | null;
          status?: BookingStatus;
          booking_type: BookingType;
          mileage?: number | null;
          notes?: string | null;
          total_price?: number | null;
          branch_id?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vendor_id?: string;
          vehicle_id?: string | null;
          service_key?: string | null;
          booking_date?: string;
          booking_time?: string | null;
          status?: BookingStatus;
          booking_type?: BookingType;
          mileage?: number | null;
          notes?: string | null;
          total_price?: number | null;
          branch_id?: string | null;
          cancelled_by?: string | null;
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
          bosta_shipment_id: string | null;
          tracking_number: string | null;
          shipped_at: string | null;
          delivered_at: string | null;
          delivery_attempts: number;
          bosta_state_code: string | null;
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
          bosta_shipment_id?: string | null;
          tracking_number?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          delivery_attempts?: number;
          bosta_state_code?: string | null;
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
          bosta_shipment_id?: string | null;
          tracking_number?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          delivery_attempts?: number;
          bosta_state_code?: string | null;
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
          display_id: number;
          user_id: string | null;
          business_name: string;
          vendor_type: VendorType;
          owner_name: string;
          email: string;
          phone: string;
          city: string | null;
          governorate: string | null;
          address: string | null;
          maps_link: string | null;
          latitude: number | null;
          longitude: number | null;
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
          governorate?: string | null;
          address?: string | null;
          maps_link?: string | null;
          latitude?: number | null;
          longitude?: number | null;
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
          governorate?: string | null;
          address?: string | null;
          maps_link?: string | null;
          latitude?: number | null;
          longitude?: number | null;
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

      // ── AUTO PARTS CATALOG ──────────────────────────────────────────────

      catalog_products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          brand: string;
          manufacturer: string;
          manufacturer_part_number: string;
          ean: string | null;
          brand_class: string | null;
          category: string;
          description: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          brand: string;
          manufacturer: string;
          manufacturer_part_number: string;
          ean?: string | null;
          brand_class?: string | null;
          category: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          brand?: string;
          manufacturer?: string;
          manufacturer_part_number?: string;
          ean?: string | null;
          brand_class?: string | null;
          category?: string;
          description?: string | null;
          image_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      product_specifications: {
        Row: {
          id: string;
          product_id: string;
          spec_name: string;
          spec_value: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          spec_name: string;
          spec_value: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          product_id?: string;
          spec_name?: string;
          spec_value?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_specifications_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "catalog_products";
            referencedColumns: ["id"];
          },
        ];
      };

      compatible_vehicles: {
        Row: {
          id: string;
          product_id: string;
          make: string;
          model: string;
          generation: string | null;
          engine: string | null;
          engine_code: string | null;
          fuel_type: string | null;
          power_hp: number | null;
          power_kw: number | null;
          engine_displacement_cc: number | null;
          body_type: string | null;
          drive_type: string | null;
          transmission: string | null;
          year_from: number | null;
          year_to: number | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          make: string;
          model: string;
          generation?: string | null;
          engine?: string | null;
          engine_code?: string | null;
          fuel_type?: string | null;
          power_hp?: number | null;
          power_kw?: number | null;
          engine_displacement_cc?: number | null;
          body_type?: string | null;
          drive_type?: string | null;
          transmission?: string | null;
          year_from?: number | null;
          year_to?: number | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          make?: string;
          model?: string;
          generation?: string | null;
          engine?: string | null;
          engine_code?: string | null;
          fuel_type?: string | null;
          power_hp?: number | null;
          power_kw?: number | null;
          engine_displacement_cc?: number | null;
          body_type?: string | null;
          drive_type?: string | null;
          transmission?: string | null;
          year_from?: number | null;
          year_to?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "compatible_vehicles_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "catalog_products";
            referencedColumns: ["id"];
          },
        ];
      };

      oe_numbers: {
        Row: {
          id: string;
          product_id: string;
          manufacturer: string;
          oe_number: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          manufacturer: string;
          oe_number: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          manufacturer?: string;
          oe_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oe_numbers_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "catalog_products";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── VENDOR CALENDAR ────────────────────────────────────────────────────

      vendor_working_hours: {
        Row: {
          id: string;
          vendor_id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          is_open: boolean;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          day_of_week: number;
          open_time?: string;
          close_time?: string;
          is_open?: boolean;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          day_of_week?: number;
          open_time?: string;
          close_time?: string;
          is_open?: boolean;
        };
        Relationships: [];
      };

      slot_overrides: {
        Row: {
          id: string;
          vendor_id: string;
          date: string;
          time: string | null;
          type: SlotOverrideType;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          date: string;
          time?: string | null;
          type: SlotOverrideType;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          date?: string;
          time?: string | null;
          type?: SlotOverrideType;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── REVIEWS ────────────────────────────────────────────────────────────

      reviews: {
        Row: {
          id: string;
          booking_id: string;
          vendor_id: string;
          user_id: string;
          rating: number;
          comment: string | null;
          vendor_reply: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          vendor_id: string;
          user_id: string;
          rating: number;
          comment?: string | null;
          vendor_reply?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          vendor_id?: string;
          user_id?: string;
          rating?: number;
          comment?: string | null;
          vendor_reply?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── NOTIFICATIONS ──────────────────────────────────────────────────────

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          body?: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── VENDOR PRODUCTS ────────────────────────────────────────────────────

      vendor_products: {
        Row: {
          id: string;
          vendor_id: string;
          name: string;
          brand: string | null;
          manufacturer: string | null;
          manufacturer_part_number: string | null;
          ean: string | null;
          category: string | null;
          subcategory: string | null;
          description: string | null;
          price: number;
          stock_quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          name: string;
          brand?: string | null;
          manufacturer?: string | null;
          manufacturer_part_number?: string | null;
          ean?: string | null;
          category?: string | null;
          subcategory?: string | null;
          description?: string | null;
          price: number;
          stock_quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          name?: string;
          brand?: string | null;
          manufacturer?: string | null;
          manufacturer_part_number?: string | null;
          ean?: string | null;
          category?: string | null;
          subcategory?: string | null;
          description?: string | null;
          price?: number;
          stock_quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      vendor_product_images: {
        Row: {
          id: string;
          product_id: string;
          image_url: string;
          position: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          image_url: string;
          position?: number;
        };
        Update: {
          id?: string;
          product_id?: string;
          image_url?: string;
          position?: number;
        };
        Relationships: [];
      };

      product_vehicles: {
        Row: {
          id: string;
          product_id: string;
          make: string | null;
          model: string | null;
          engine: string | null;
          fuel_type: string | null;
          power_hp: number | null;
          year_from: number | null;
          year_to: number | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          make?: string | null;
          model?: string | null;
          engine?: string | null;
          fuel_type?: string | null;
          power_hp?: number | null;
          year_from?: number | null;
          year_to?: number | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          make?: string | null;
          model?: string | null;
          engine?: string | null;
          fuel_type?: string | null;
          power_hp?: number | null;
          year_from?: number | null;
          year_to?: number | null;
        };
        Relationships: [];
      };

      product_oe_numbers: {
        Row: {
          id: string;
          product_id: string;
          manufacturer: string | null;
          oe_number: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          manufacturer?: string | null;
          oe_number?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          manufacturer?: string | null;
          oe_number?: string | null;
        };
        Relationships: [];
      };

      // ── PROMO CODES ────────────────────────────────────────────────────────

      promo_codes: {
        Row: {
          id: string;
          code: string;
          discount_type: "percentage" | "fixed";
          discount_value: number;
          min_order_amount: number | null;
          max_uses: number | null;
          current_uses: number;
          active: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_type: "percentage" | "fixed";
          discount_value: number;
          min_order_amount?: number | null;
          max_uses?: number | null;
          current_uses?: number;
          active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_type?: "percentage" | "fixed";
          discount_value?: number;
          min_order_amount?: number | null;
          max_uses?: number | null;
          current_uses?: number;
          active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── WISHLIST ───────────────────────────────────────────────────────────

      wishlist: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── MAINTENANCE RECORDS ────────────────────────────────────────────────

      maintenance_records: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          booking_id: string | null;
          service_type: string;
          description: string | null;
          mileage: number | null;
          service_date: string;
          cost: number | null;
          vendor_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          user_id: string;
          booking_id?: string | null;
          service_type: string;
          description?: string | null;
          mileage?: number | null;
          service_date: string;
          cost?: number | null;
          vendor_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          user_id?: string;
          booking_id?: string | null;
          service_type?: string;
          description?: string | null;
          mileage?: number | null;
          service_date?: string;
          cost?: number | null;
          vendor_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── CATEGORIES ────────────────────────────────────────────────────────

      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          parent_id: string | null;
          type: "parts" | "service";
          icon: string | null;
          image_url: string | null;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          parent_id?: string | null;
          type: "parts" | "service";
          icon?: string | null;
          image_url?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          parent_id?: string | null;
          type?: "parts" | "service";
          icon?: string | null;
          image_url?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      car_makes: {
        Row: {
          id: string;
          name: string;
          name_ar: string | null;
          logo_url: string | null;
          popular: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_ar?: string | null;
          logo_url?: string | null;
          popular?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_ar?: string | null;
          logo_url?: string | null;
          popular?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      car_models: {
        Row: {
          id: string;
          make_id: string;
          name: string;
          year_from: number;
          year_to: number | null;
          body_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          make_id: string;
          name: string;
          year_from: number;
          year_to?: number | null;
          body_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          make_id?: string;
          name?: string;
          year_from?: number;
          year_to?: number | null;
          body_type?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "car_models_make_id_fkey";
            columns: ["make_id"];
            isOneToOne: false;
            referencedRelation: "car_makes";
            referencedColumns: ["id"];
          },
        ];
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
      get_vendor_customers_service: {
        Args: { p_vendor_id: string };
        Returns: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          visit_count: number;
          total_spent: number;
          last_activity: string | null;
        }[];
      };
      get_vendor_customers_parts: {
        Args: { p_vendor_id: string };
        Returns: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          visit_count: number;
          total_spent: number;
          last_activity: string | null;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      vendor_type: VendorType;
      vendor_status: VendorStatus;
      booking_status: BookingStatus;
      order_status: OrderStatus;
      notification_type: NotificationType;
      slot_override_type: SlotOverrideType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTO PARTS CATALOG — Type Definitions
// Mirrors tables in supabase/catalog_schema.sql
// ─────────────────────────────────────────────────────────────────────────────

/** Quality tier for a catalog product. */
export type BrandClass = "Premium" | "OEM" | "Aftermarket";

/**
 * Row type for `catalog_products`.
 * Core product identity — one row per SKU.
 */
export interface DbCatalogProduct {
  id: string;
  /** English/default URL slug, e.g. "skf-vkmc-03316" */
  slug: string;
  /** Arabic UTF-8 slug for /ar/ URLs, e.g. "فحمات-فرامل-تويوتا" */
  slug_ar: string | null;
  /** Explicit English SEO slug (may differ from slug), e.g. "brake-pads-toyota-corolla" */
  slug_en: string | null;
  name: string;
  /** Arabic product name for bilingual display and Arabic-first SEO */
  name_ar: string | null;
  brand: string;
  manufacturer: string;
  manufacturer_part_number: string;
  ean: string | null;
  /** Quality tier string from the DB. Narrow to BrandClass in UI when needed. */
  brand_class: string | null;
  category: string;
  description: string | null;
  image_url: string | null;
  /** Arabic keyword synonyms, e.g. ["فحمات فرامل", "تيل فرامل"] */
  keywords_ar: string[] | null;
  /** English keyword synonyms, e.g. ["brake pads", "brake linings"] */
  keywords_en: string[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * Row type for `product_specifications`.
 * Key-value store for technical attributes.
 * Works for any part category without schema changes.
 */
export interface DbProductSpecification {
  id: string;
  product_id: string;
  spec_name: string;
  spec_value: string;
  sort_order: number;
}

/**
 * Row type for `compatible_vehicles`.
 * One row = one vehicle application (fitment).
 */
export interface DbCompatibleVehicle {
  id: string;
  product_id: string;
  make: string;
  model: string;
  generation: string | null;
  engine: string | null;
  engine_code: string | null;
  fuel_type: string | null;
  power_hp: number | null;
  power_kw: number | null;
  engine_displacement_cc: number | null;
  body_type: string | null;
  drive_type: string | null;
  transmission: string | null;
  year_from: number | null;
  year_to: number | null;
}

/**
 * Row type for `oe_numbers`.
 * OE cross-reference number from a vehicle manufacturer or supplier.
 */
export interface DbOeNumber {
  id: string;
  product_id: string;
  manufacturer: string;
  oe_number: string;
}

/**
 * Full product record with all related data joined.
 * Returned by `getProductBySlug()`.
 */
export interface DbCatalogProductFull extends DbCatalogProduct {
  specifications: DbProductSpecification[];
  compatible_vehicles: DbCompatibleVehicle[];
  oe_numbers: DbOeNumber[];
}
