// Core vehicle types
export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  trim?: string;
  engineType?: string;
  engineCode?: string;
  engine?: string;
  transmission?: string;
  chassis?: string;
  color?: string;
  plate?: string;
  mileage?: number;
}

// Part / Product types
export interface Part {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  condition: "new" | "used" | "refurbished";
  oemNumber?: string;
  partNumber?: string;
  images: string[];
  compatibleVehicles: string[];
  vendorId: string;
  vendorName: string;
  vendorRating: number;
  stock: number;
  deliveryDays?: number;
  warrantyMonths?: number;
  installationAvailable: boolean;
  rating: number;
  reviewCount: number;
  location: string;
  category: string;
  subcategory?: string;
}

export interface PartCategory {
  slug: string;
  name: string;
  nameAr: string;
  icon: string;
  subcategories?: PartSubcategory[];
}

export interface PartSubcategory {
  slug: string;
  name: string;
  nameAr: string;
  partCount: number;
  image?: string;
}

// Service types
export interface ServiceCenter {
  id: string;
  slug: string;
  name: string;
  nameAr?: string;
  coverImage: string;
  gallery?: string[];
  address: string;
  city: string;
  rating: number;
  reviewCount: number;
  completedBookings: number;
  services: ServiceOffering[];
  hours: string;
  phone: string;
  certifications: string[];
  specializations: string[];
  verified: boolean;
}

export interface ServiceOffering {
  id: string;
  name: string;
  nameAr?: string;
  startingPrice?: number;
  duration?: string;
  badge?: string;
}

export interface Booking {
  id: string;
  serviceCenterId: string;
  serviceCenterName: string;
  vehicleId: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string;
  totalPrice?: number;
}

// Vendor types
export interface Vendor {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  commercialRegNumber: string;
  taxId?: string;
  logo?: string;
  verified: boolean;
  rating: number;
  totalSales: number;
  status: "pending" | "approved" | "rejected" | "suspended";
}

export interface VendorOnboardingStep {
  id: number;
  title: string;
  path: string;
  completed: boolean;
}

// Review types
export interface Review {
  id: string;
  authorName: string;
  authorAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  verifiedPurchase: boolean;
  photos?: string[];
  helpfulCount: number;
}

// Filter types
export interface PartsFilter {
  carBrand?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  engineCode?: string;
  oemNumber?: string;
  vendor?: string;
  priceMin?: number;
  priceMax?: number;
  condition?: string;
  location?: string;
  inStockOnly?: boolean;
  maxDeliveryDays?: number;
  minRating?: number;
}

export interface ServiceFilter {
  location?: string;
  minRating?: number;
  priceMin?: number;
  priceMax?: number;
  availableToday?: boolean;
  mobile?: boolean;
}
