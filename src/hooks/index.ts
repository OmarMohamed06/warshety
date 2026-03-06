/**
 * Hooks barrel — import from here everywhere in the app.
 *
 * ✅  useGarage  — full garage management (vehicles list, add/remove/update)
 * ✅  useCart    — cart state (add/remove, qty, promos, totals, per-item helpers)
 * ✅  useVehicle — compatibility engine (isCompatible, filterCompatible, query)
 *
 * Example:
 *   import { useCart, useVehicle } from "@/hooks";
 */

export { useGarage } from "./useGarage";
export type { UseGarageReturn, NewVehicleInput } from "./useGarage";

export { useCart } from "./useCart";
export type { UseCartReturn, CartItem, AddCartItemInput } from "./useCart";

export { useVehicle } from "./useVehicle";
export type { UseVehicleReturn, VehicleCompatibilityQuery } from "./useVehicle";
