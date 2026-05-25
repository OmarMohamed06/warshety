/**
 * Hooks barrel — import from here everywhere in the app.
 *
 * ✅  useGarage  — full garage management (vehicles list, add/remove/update)
 * ✅  useVehicle — compatibility engine (isCompatible, filterCompatible, query)
 *
 * Example:
 *   import { useVehicle } from "@/hooks";
 */

export { useGarage } from "./useGarage";
export type { UseGarageReturn, NewVehicleInput } from "./useGarage";

export { useVehicle } from "./useVehicle";
export type { UseVehicleReturn, VehicleCompatibilityQuery } from "./useVehicle";

export { useBooking } from "./useBooking";
export type { UseBookingReturn } from "./useBooking";

export { useCarMakes, useCarModels } from "./useCarData";
export type { CarMake, CarModel } from "./useCarData";
