import type { Metadata } from "next";
import Link from "next/link";
import { generateSeoMeta } from "@/utils/seo";

export const metadata: Metadata = generateSeoMeta({
  title: "Parts Shop — Browse All Car Parts Categories",
  description:
    "Browse all car parts categories in Egypt. Brakes, engine parts, suspension, filters, lighting and more. Compatible with your vehicle. قطع غيار جميع الفئات.",
  path: "/parts",
});

const CATEGORIES = [
  {
    slug: "brake-system",
    name: "Brake System",
    nameAr: "نظام الفرامل",
    icon: "minor_crash",
    partCount: 1240,
    subcategories: [
      "Brake Discs",
      "Brake Pads",
      "Brake Calipers",
      "Splash Guards",
      "Brake System Accessories",
      "Brake Pad Wear Indicators",
      "Caliper Parts",
      "Handbrake Parts",
      "Brake Drums",
      "Brake Shoes",
      "Wheel Brake Cylinders",
      "Drum Brake Parts",
      "ABS Sensors & Rings",
      "Brake Master Cylinders",
      "Brake Hoses",
      "Parking Brake Cables",
      "Brake Line Fittings",
      "Brake Boosters",
      "Brake Power Regulator",
      "Brake Lines",
      "Brake Vacuum Pumps",
    ],
  },
  {
    slug: "filters",
    name: "Filters",
    nameAr: "الفلاتر",
    icon: "filter_alt",
    partCount: 560,
    subcategories: [
      "Oil Filters",
      "Air Filters",
      "Cabin Air Filters",
      "Fuel Filters",
      "Filter Sets",
      "Hydraulic Filters",
      "Coolant Filters",
      "Power Steering Filters",
    ],
  },
  {
    slug: "suspension",
    name: "Suspension",
    nameAr: "نظام التعليق",
    icon: "shutter_speed",
    partCount: 980,
    subcategories: [
      "Shock Absorbers",
      "Coil Springs",
      "Strut Bearings & Mounts",
      "Strut Boots",
      "Wheel Bearings",
      "Wheel Hubs",
      "Control Arms",
      "Wheel Nuts, Bolts & Studs",
      "Pitman Arms",
      "Sway Bar Links",
      "Stabilizers",
      "Spring Caps",
      "Ball Joints",
      "Suspension Bushings",
      "Air Springs",
      "Steering Knuckles",
      "Leaf Springs",
      "Stub Axles",
      "Suspension Repair Kits",
      "Wheel Spacers",
      "Wheel Bearing Housings",
      "Axle Beams",
    ],
  },
  {
    slug: "steering",
    name: "Steering",
    nameAr: "نظام التوجيه",
    icon: "directions_car",
    partCount: 640,
    subcategories: [
      "Tie Rod Ends",
      "Tie Rod Assemblies",
      "Steering Racks",
      "Power Steering Pumps",
      "Rack Bellows",
      "Steering Arms",
      "Steering Hoses",
      "Steering Columns",
      "Steering Dampers",
      "Power Steering Tanks",
      "Steering Locks",
      "Rack Mountings",
    ],
  },
  {
    slug: "wipers-washers",
    name: "Wipers & Washers",
    nameAr: "المساحات والغسيل",
    icon: "water_drop",
    partCount: 310,
    subcategories: [
      "Wiper Blades",
      "Wiper Motors",
      "Windscreen Washer Pumps",
      "Wiper Linkage Assemblies",
      "Headlight Washer Pumps",
      "Wiper Arms",
      "Washer Fluid Nozzles",
      "Washer Fluid Tanks",
    ],
  },
  {
    slug: "engine-parts",
    name: "Engine Parts",
    nameAr: "قطع المحرك",
    icon: "earth_engine",
    partCount: 3820,
    subcategories: [
      "Timing Belt Kits",
      "Engine Gaskets & Seals",
      "Timing Chain Sets",
      "Throttle Bodies",
      "Engine Belts & Chains",
      "Tensioners & Pulleys",
      "Turbochargers",
      "Turbocharger Hoses",
      "Turbocharger Parts",
      "Cylinder Head Parts",
      "Engine Block & Crankshaft",
      "Engine Lubrication",
      "EGR System",
      "Intake Manifolds",
      "Air Supply Hoses",
      "Engine Mountings",
      "Accelerator Cables",
      "Idle Control Valves",
    ],
  },
  {
    slug: "fuel-system",
    name: "Fuel System",
    nameAr: "نظام الوقود",
    icon: "local_gas_station",
    partCount: 720,
    subcategories: [
      "Injector Nozzles",
      "Injector & Nozzle Parts",
      "Fuel Pumps",
      "Fuel System Gaskets",
      "Fuel Tanks",
      "High Pressure Pumps",
      "Fuel Lines & Hoses",
      "Fuel System Valves",
      "Fuel Pressure Regulators",
      "Carburettor Parts",
      "Water in Fuel Sensors",
      "Secondary Air Injection Pumps",
      "AdBlue Modules",
      "NOx & AdBlue Sensors",
    ],
  },
  {
    slug: "exhaust-system",
    name: "Exhaust System",
    nameAr: "نظام العادم",
    icon: "blur_circular",
    partCount: 350,
    subcategories: [
      "Silencers",
      "Exhaust Pipes",
      "Catalytic Converters",
      "Exhaust Manifolds",
      "Diesel Particulate Filters (DPF)",
      "Exhaust Gaskets",
      "Lambda Sensors",
      "Exhaust Mounting Parts",
      "Exhaust System Sensors",
      "Exhaust System Valves",
    ],
  },
  {
    slug: "electric-system",
    name: "Electric System",
    nameAr: "النظام الكهربائي",
    icon: "battery_charging_full",
    partCount: 2100,
    subcategories: [
      "Alternators",
      "Alternator Freewheel Clutches",
      "Sensors",
      "Spark Plugs",
      "Starters",
      "Glow Plugs",
      "Ignition Coils",
      "Switches",
      "Spark Plug Wires",
      "Ignition Distributor Parts",
      "Alternator Parts",
      "Alternator Regulators",
      "Starter Parts",
      "Control Units",
      "Solenoid Switches",
      "Air Horns",
      "Harnesses",
      "Airbag Clock Springs",
    ],
  },
  {
    slug: "engine-cooling",
    name: "Engine Cooling",
    nameAr: "تبريد المحرك",
    icon: "thermometer",
    partCount: 480,
    subcategories: [
      "Water Pumps",
      "Cooling System Gaskets & Seals",
      "Water Pump Pulleys",
      "Cooling Radiators",
      "Radiator Hoses & Pipes",
      "Radiator Fans",
      "Intercoolers",
      "Thermostats",
      "Coolant Expansion Tanks",
      "Antifreeze",
      "Cooling System Sensors",
      "Radiator Mountings",
      "Oil Cooler & Pipes",
      "Coolant Flanges",
    ],
  },
  {
    slug: "heating-ventilation",
    name: "Heating & Ventilation",
    nameAr: "التدفئة والتهوية",
    icon: "ac_unit",
    partCount: 430,
    subcategories: [
      "A/C Compressors",
      "A/C Condensers",
      "A/C Dryers",
      "Interior Blower Motors",
      "Heater Cores",
      "Heater Hoses",
      "Parking Heaters",
      "Evaporators",
      "A/C Hoses & Pipes",
      "A/C Relays",
      "A/C Switches & Actuators",
      "Temperature Sensors",
      "A/C Control Units",
      "Heater Control Units",
    ],
  },
  {
    slug: "transmission-clutch",
    name: "Transmission & Clutch",
    nameAr: "ناقل الحركة والكلتش",
    icon: "settings",
    partCount: 870,
    subcategories: [
      "Clutch Kits",
      "Drive Shafts",
      "Flywheels",
      "CV Joints",
      "CV Boots",
      "Individual Clutch Parts",
      "Transmission Oil Change Kits",
      "Universal & Flex Joints",
      "Transmission Gaskets",
      "Propshafts",
      "Propshaft Centre Bearings",
      "Clutch Master Cylinders",
      "Gear Selector Rods",
      "Transmission Mountings",
      "Transmission Oil Coolers",
      "Differential Parts",
    ],
  },
  {
    slug: "car-body-interior",
    name: "Car Body & Interior",
    nameAr: "هيكل السيارة والداخلية",
    icon: "drive_eta",
    partCount: 2600,
    subcategories: [
      "Door Handles & Locks",
      "Window Lifts",
      "Gas Springs",
      "Bumper Parts",
      "Fenders",
      "Mirrors",
      "Mudguards",
      "Interior Parts",
      "Front Grilles",
      "Door Parts",
      "Bonnet & Parts",
      "Tailgate Lift Motor",
      "Trim & Protective Strips",
      "Floor Panels",
      "Window Seals",
      "License Plate Holders",
      "Engine Covers",
      "Seat Adjustment Parts",
      "Antennas",
    ],
  },
  {
    slug: "lighting",
    name: "Lighting",
    nameAr: "الإضاءة",
    icon: "lightbulb",
    partCount: 740,
    subcategories: [
      "Tail Lights",
      "Headlights",
      "Headlight Parts",
      "Tail Light Parts",
      "Car Bulbs",
      "Turn Signal Lights",
      "Lighting Switches",
      "Front Fog Lights",
      "Rear Fog Lights",
      "License Plate Lights",
      "Reverse Lights",
      "Daytime Running Lights",
      "Stop Lights",
    ],
  },
  {
    slug: "oils-fluids",
    name: "Oils & Fluids",
    nameAr: "الزيوت والسوائل",
    icon: "oil_barrel",
    partCount: 620,
    subcategories: [
      "Engine Oil",
      "Coolant / Antifreeze",
      "Brake Fluid",
      "Transmission Fluid",
      "Power Steering Fluid",
      "Windscreen Washer Fluid",
    ],
  },
  {
    slug: "accessories-equipment",
    name: "Accessories & Equipment",
    nameAr: "الإكسسوارات والمعدات",
    icon: "build",
    partCount: 1380,
    subcategories: [
      "Interior Comfort & Protection",
      "Additional Lighting",
      "Towbars & Wiring Kits",
      "Car Mats",
      "Trunk Mats",
      "Snow Chains & Socks",
      "Jump Start Cables",
      "Universal Parking Sensors",
      "Reversing Cameras",
      "Roof Bars & Accessories",
      "Bike Carriers",
      "Car Covers",
      "Wheel Trims",
    ],
  },
];

export default function PartsPage() {
  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      {/* Page header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <nav className="text-xs text-slate-400 mb-4 flex items-center gap-2">
            <Link href="/" className="hover:text-[#FF4B19]">
              Home
            </Link>
            <span className="material-symbols-outlined text-sm">
              chevron_right
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Parts Shop
            </span>
          </nav>
          <h1 className="text-4xl font-black mb-2">Parts Shop</h1>
          <p className="text-slate-500">
            Browse{" "}
            {CATEGORIES.reduce((s, c) => s + c.partCount, 0).toLocaleString()}+
            genuine parts from verified vendors across Egypt.
          </p>
        </div>
      </div>

      {/* Categories grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/parts/${cat.slug}`}
              className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 hover:border-[#FF4B19] hover:shadow-xl transition-all group"
            >
              {/* Icon header */}
              <div className="h-32 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-700 shadow-md flex items-center justify-center group-hover:bg-[#FF4B19] transition-colors">
                  <span className="material-symbols-outlined text-4xl group-hover:text-white transition-colors">
                    {cat.icon}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-black text-lg mb-1">{cat.name}</h3>
                <p className="text-xs text-slate-400 mb-3">{cat.nameAr}</p>
                <p className="text-sm text-slate-500 mb-4">
                  {cat.partCount.toLocaleString()} parts available
                </p>

                {/* Subcategory pills */}
                <div className="flex flex-wrap gap-1">
                  {cat.subcategories.slice(0, 3).map((sub) => (
                    <span
                      key={sub}
                      className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded"
                    >
                      {sub}
                    </span>
                  ))}
                  {cat.subcategories.length > 3 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FF4B19]/10 text-[#FF4B19] rounded">
                      +{cat.subcategories.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
