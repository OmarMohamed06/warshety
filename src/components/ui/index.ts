/**
 * @garage/ui — design-system primitives
 *
 * Import everything from this barrel:
 *
 *   import { Button, Input, Select, Badge, Modal, ConfirmModal } from "@/components/ui";
 *   import type { ButtonVariant, BadgeVariant, SelectOption } from "@/components/ui";
 */

// Button
export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

// Input
export { Input } from "./Input";
export type { InputProps } from "./Input";

// Select
export { Select } from "./Select";
export type { SelectProps, SelectOption } from "./Select";

// Badge
export { Badge, statusVariant } from "./Badge";
export type { BadgeProps, BadgeVariant, BadgeSize } from "./Badge";

// Modal
export { Modal, ConfirmModal } from "./Modal";
export type { ModalProps, ModalSize, ConfirmModalProps } from "./Modal";
