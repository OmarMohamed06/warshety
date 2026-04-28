export interface ServiceCategory {
  key: string;
  icon: string;
  image: string;
  services: string[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    key: "mechanical",
    icon: "build",
    image:
      "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=600&q=80",
    services: [
      "mechanical-repair",
      "transmission-repair",
      "suspension-repair",
      "brake-services",
      "exhaust-repair",
      "cv-joints-repair",
    ],
  },
  {
    key: "electrical",
    icon: "electrical_services",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    services: [
      "electrical-repair",
      "computer-diagnostics",
      "key-lock-services",
    ],
  },
  {
    key: "maintenance",
    icon: "oil_barrel",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80",
    services: [
      "oil-change",
      "routine-maintenance",
      "preventive-maintenance",
      "quick-service",
    ],
  },
  {
    key: "cooling-ac",
    icon: "ac_unit",
    image:
      "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&q=80",
    services: [
      "ac-recharge",
      "ac-repair",
      "radiator-repair",
      "cooling-system-service",
    ],
  },
  {
    key: "body-exterior",
    icon: "car_crash",
    image:
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&q=80",
    services: [
      "body-repair",
      "paint",
      "paintless-dent-repair",
      "car-glass-repair",
      "headlight-restoration",
    ],
  },
  {
    key: "tires-wheels",
    icon: "tire_repair",
    image: "/car-mechanic-changing-wheels-car.jpg",
    services: ["tires-services", "wheel-alignment"],
  },
  {
    key: "batteries-accessories",
    icon: "battery_charging_full",
    image: "/spoiler-red-sports-car-white-room.jpg",
    services: ["batteries-services", "car-accessories", "gps-tracking"],
  },
  {
    key: "car-care",
    icon: "cleaning_services",
    image: "/male-worker-wrapping-car-with-ptotective-foil.jpg",
    services: [
      "car-wash-detailing",
      "car-polishing",
      "car-upholstery",
      "car-wrapping",
      "car-modification",
    ],
  },
  {
    key: "inspection",
    icon: "fact_check",
    image: "/car-dealer-signing-papers.jpg",
    services: ["vehicle-inspection", "pre-purchase-inspection"],
  },
];
