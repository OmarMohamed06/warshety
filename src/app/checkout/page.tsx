"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useGarage } from "@/context/GarageContext";
import { useAuth } from "@/context/AuthContext";
import { saveOrder } from "@/services/orderService";

// ── Constants ─────────────────────────────────────────────────────────────────

const GOVERNORATES = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Qalyubia",
  "Sharqia",
  "Dakahlia",
  "Beheira",
  "Monufia",
  "Gharbia",
  "Kafr El-Sheikh",
  "Damietta",
  "Port Said",
  "Ismailia",
  "Suez",
  "North Sinai",
  "South Sinai",
  "Faiyum",
  "Beni Suef",
  "Minya",
  "Asyut",
  "Sohag",
  "Qena",
  "Luxor",
  "Aswan",
  "Red Sea",
  "New Valley",
  "Matruh",
];

type PaymentMethod = "cod" | "card" | "wallet";
type WalletProvider = "vodafone" | "etisalat" | "we" | "instapay";
type Step = "delivery" | "payment" | "success";

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateOrderId(): string {
  return `GRG-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step | "review"; label: string; icon: string }[] = [
    { key: "delivery", label: "Delivery", icon: "local_shipping" },
    { key: "payment", label: "Payment", icon: "payment" },
    { key: "success", label: "Confirm", icon: "check_circle" },
  ];
  const activeIndex = step === "delivery" ? 0 : step === "payment" ? 1 : 2;

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                      ? "bg-[#FF4B19] text-white shadow-lg shadow-[#FF4B19]/30"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "18px" }}
                >
                  {done ? "check" : s.icon}
                </span>
              </div>
              <span
                className={`text-xs font-bold ${
                  active
                    ? "text-[#FF4B19]"
                    : done
                      ? "text-green-600 dark:text-green-400"
                      : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mb-5 mx-2 rounded transition-all ${
                  done ? "bg-green-400" : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderSummary() {
  const {
    items,
    subtotal,
    shipping,
    discount,
    total,
    promo,
    changeQty,
    removeItem,
  } = useCart();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">
          Order Summary
        </h3>
        <span className="text-xs font-bold text-slate-400">
          {items.reduce((s, i) => s + i.qty, 0)} items
        </span>
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-72 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="px-5 py-3 flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF4B19]/8 flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-[#FF4B19]"
                style={{ fontSize: "20px" }}
              >
                {item.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
                {item.name}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{item.vendor}</p>
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => changeQty(item.id, -1)}
                    className="w-5 h-5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "13px" }}
                    >
                      remove
                    </span>
                  </button>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-4 text-center">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => changeQty(item.id, 1)}
                    className="w-5 h-5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "13px" }}
                    >
                      add
                    </span>
                  </button>
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  EGP {(item.price * item.qty).toLocaleString("en-EG")}
                </p>
              </div>
            </div>
            <button
              onClick={() => removeItem(item.id)}
              className="self-start mt-0.5 text-slate-300 hover:text-red-400 transition-colors"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "15px" }}
              >
                close
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {promo && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#FF4B19]/8 rounded-xl mb-2">
            <span
              className="material-symbols-outlined text-[#FF4B19]"
              style={{ fontSize: "14px" }}
            >
              local_offer
            </span>
            <span className="text-xs font-bold text-[#FF4B19] flex-1">
              {promo.code}
            </span>
            <span className="text-xs text-[#FF4B19] font-semibold">
              -{promo.discountPct}%
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Subtotal</span>
          <span className="font-semibold">
            EGP {subtotal.toLocaleString("en-EG")}
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-[#FF4B19]">
            <span>Discount</span>
            <span className="font-semibold">
              − EGP {discount.toLocaleString("en-EG")}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Shipping</span>
          <span
            className={`font-semibold ${
              shipping === 0 ? "text-green-600 dark:text-green-400" : ""
            }`}
          >
            {shipping === 0 ? "Free" : `EGP ${shipping}`}
          </span>
        </div>
        {shipping > 0 && (
          <p className="text-[10px] text-slate-400">
            Free shipping on orders above EGP 2,000
          </p>
        )}
        <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="font-black text-slate-900 dark:text-white text-sm">
            Total
          </span>
          <span className="font-black text-lg text-[#FF4B19]">
            EGP {total.toLocaleString("en-EG")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Delivery Step ─────────────────────────────────────────────────────────────

interface DeliveryForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  governorate: string;
  city: string;
  address: string;
  apartment: string;
  notes: string;
}

function DeliveryStep({
  form,
  onChange,
  onNext,
}: {
  form: DeliveryForm;
  onChange: (f: DeliveryForm) => void;
  onNext: () => void;
}) {
  const { vehicles, activeVehicle } = useGarage();
  const [errors, setErrors] = useState<Partial<DeliveryForm>>({});

  function set(key: keyof DeliveryForm, val: string) {
    onChange({ ...form, [key]: val });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validate() {
    const e: Partial<DeliveryForm> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    else if (!/^(\+20|0)?1[0125]\d{8}$/.test(form.phone.replace(/\s/g, "")))
      e.phone = "Enter a valid Egyptian mobile number";
    if (!form.email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email";
    if (!form.governorate) e.governorate = "Required";
    if (!form.city.trim()) e.city = "Required";
    if (!form.address.trim()) e.address = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (validate()) onNext();
  }

  const inputCls = (err?: string) =>
    `w-full bg-slate-50 dark:bg-slate-800 border ${
      err
        ? "border-red-400 focus:ring-red-400/30"
        : "border-slate-200 dark:border-slate-700 focus:ring-[#FF4B19]/30"
    } rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 text-slate-800 dark:text-slate-100 placeholder-slate-400`;

  return (
    <div className="space-y-6">
      {/* Vehicle selector notice */}
      {vehicles.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
          <span
            className="material-symbols-outlined text-blue-500 mt-0.5 shrink-0"
            style={{ fontSize: "18px" }}
          >
            info
          </span>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Parts will be verified for compatibility with{" "}
            <span className="font-bold">
              {activeVehicle
                ? `${activeVehicle.year} ${activeVehicle.brand} ${activeVehicle.model}`
                : "your saved vehicles"}
            </span>
            .
          </p>
        </div>
      )}

      {/* Name */}
      <div>
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
          Contact Information
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              placeholder="First name *"
              className={inputCls(errors.firstName)}
            />
            {errors.firstName && (
              <p className="text-[11px] text-red-500 mt-1">
                {errors.firstName}
              </p>
            )}
          </div>
          <div>
            <input
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              placeholder="Last name *"
              className={inputCls(errors.lastName)}
            />
            {errors.lastName && (
              <p className="text-[11px] text-red-500 mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Mobile number * (01x)"
              className={inputCls(errors.phone)}
            />
            {errors.phone && (
              <p className="text-[11px] text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>
          <div>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="Email address *"
              className={inputCls(errors.email)}
            />
            {errors.email && (
              <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
          Delivery Address
        </h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <select
                value={form.governorate}
                onChange={(e) => set("governorate", e.target.value)}
                className={inputCls(errors.governorate)}
              >
                <option value="">Governorate *</option>
                {GOVERNORATES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              {errors.governorate && (
                <p className="text-[11px] text-red-500 mt-1">
                  {errors.governorate}
                </p>
              )}
            </div>
            <div>
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="City / District *"
                className={inputCls(errors.city)}
              />
              {errors.city && (
                <p className="text-[11px] text-red-500 mt-1">{errors.city}</p>
              )}
            </div>
          </div>
          <div>
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Street address *"
              className={inputCls(errors.address)}
            />
            {errors.address && (
              <p className="text-[11px] text-red-500 mt-1">{errors.address}</p>
            )}
          </div>
          <input
            value={form.apartment}
            onChange={(e) => set("apartment", e.target.value)}
            placeholder="Apartment / Floor / Building (optional)"
            className={inputCls()}
          />
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Delivery notes (optional) — landmarks, gate code, etc."
            rows={2}
            className={`${inputCls()} resize-none`}
          />
        </div>
      </div>

      <button
        onClick={handleNext}
        className="w-full py-3.5 bg-[#FF4B19] hover:bg-[#e03d0f] text-white font-black rounded-2xl shadow-lg shadow-[#FF4B19]/20 transition-colors flex items-center justify-center gap-2"
      >
        Continue to Payment
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "20px" }}
        >
          arrow_forward
        </span>
      </button>
    </div>
  );
}

// ── Payment Step ──────────────────────────────────────────────────────────────

interface CardForm {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
}

function PaymentStep({
  method,
  setMethod,
  walletProvider,
  setWalletProvider,
  walletNumber,
  setWalletNumber,
  cardForm,
  setCardForm,
  onBack,
  onPlace,
  placing,
}: {
  method: PaymentMethod;
  setMethod: (m: PaymentMethod) => void;
  walletProvider: WalletProvider;
  setWalletProvider: (w: WalletProvider) => void;
  walletNumber: string;
  setWalletNumber: (s: string) => void;
  cardForm: CardForm;
  setCardForm: (f: CardForm) => void;
  onBack: () => void;
  onPlace: () => void;
  placing: boolean;
}) {
  const { total } = useCart();
  const [cardErrors, setCardErrors] = useState<Partial<CardForm>>({});

  function formatCardNumber(val: string) {
    return val
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }

  function formatExpiry(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  }

  function validateCard() {
    const e: Partial<CardForm> = {};
    if (
      !cardForm.number.replace(/\s/g, "") ||
      cardForm.number.replace(/\s/g, "").length < 16
    )
      e.number = "Enter a valid 16-digit card number";
    if (!cardForm.name.trim()) e.name = "Required";
    if (!cardForm.expiry || cardForm.expiry.length < 5)
      e.expiry = "Enter MM/YY";
    if (!cardForm.cvv || cardForm.cvv.length < 3) e.cvv = "Enter 3-digit CVV";
    setCardErrors(e);
    return Object.keys(e).length === 0;
  }

  function handlePlace() {
    if (method === "card" && !validateCard()) return;
    onPlace();
  }

  const WALLET_PROVIDERS: {
    id: WalletProvider;
    label: string;
    color: string;
  }[] = [
    { id: "vodafone", label: "Vodafone Cash", color: "text-red-600" },
    { id: "etisalat", label: "Etisalat Cash", color: "text-green-600" },
    { id: "we", label: "WE Pay", color: "text-purple-600" },
    { id: "instapay", label: "InstaPay", color: "text-blue-600" },
  ];

  const inputCls = (err?: string) =>
    `w-full bg-slate-50 dark:bg-slate-800 border ${
      err
        ? "border-red-400 focus:ring-red-400/30"
        : "border-slate-200 dark:border-slate-700 focus:ring-[#FF4B19]/30"
    } rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 text-slate-800 dark:text-slate-100 placeholder-slate-400`;

  return (
    <div className="space-y-5">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
        Payment Method
      </h4>

      {/* Method selector */}
      <div className="space-y-2.5">
        {[
          {
            id: "cod" as PaymentMethod,
            icon: "payments",
            label: "Cash on Delivery",
            desc: "Pay when your order arrives",
          },
          {
            id: "card" as PaymentMethod,
            icon: "credit_card",
            label: "Credit / Debit Card",
            desc: "Visa, Mastercard, Meeza",
          },
          {
            id: "wallet" as PaymentMethod,
            icon: "account_balance_wallet",
            label: "Mobile Wallet",
            desc: "Vodafone Cash, InstaPay & more",
          },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => setMethod(opt.id)}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
              method === opt.id
                ? "border-[#FF4B19] bg-[#FF4B19]/5 dark:bg-[#FF4B19]/10"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                method === opt.id
                  ? "bg-[#FF4B19]/10"
                  : "bg-slate-100 dark:bg-slate-800"
              }`}
            >
              <span
                className={`material-symbols-outlined ${
                  method === opt.id ? "text-[#FF4B19]" : "text-slate-400"
                }`}
                style={{ fontSize: "22px" }}
              >
                {opt.icon}
              </span>
            </div>
            <div className="flex-1">
              <p
                className={`text-sm font-bold ${
                  method === opt.id
                    ? "text-[#FF4B19]"
                    : "text-slate-800 dark:text-slate-100"
                }`}
              >
                {opt.label}
              </p>
              <p className="text-xs text-slate-400">{opt.desc}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                method === opt.id
                  ? "border-[#FF4B19] bg-[#FF4B19]"
                  : "border-slate-300 dark:border-slate-600"
              }`}
            >
              {method === opt.id && (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Card form */}
      {method === "card" && (
        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Card Details
          </p>
          <div>
            <input
              value={cardForm.number}
              onChange={(e) =>
                setCardForm({
                  ...cardForm,
                  number: formatCardNumber(e.target.value),
                })
              }
              placeholder="Card number"
              className={inputCls(cardErrors.number)}
              maxLength={19}
            />
            {cardErrors.number && (
              <p className="text-[11px] text-red-500 mt-1">
                {cardErrors.number}
              </p>
            )}
          </div>
          <div>
            <input
              value={cardForm.name}
              onChange={(e) =>
                setCardForm({ ...cardForm, name: e.target.value })
              }
              placeholder="Cardholder name"
              className={inputCls(cardErrors.name)}
            />
            {cardErrors.name && (
              <p className="text-[11px] text-red-500 mt-1">{cardErrors.name}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                value={cardForm.expiry}
                onChange={(e) =>
                  setCardForm({
                    ...cardForm,
                    expiry: formatExpiry(e.target.value),
                  })
                }
                placeholder="MM / YY"
                className={inputCls(cardErrors.expiry)}
                maxLength={5}
              />
              {cardErrors.expiry && (
                <p className="text-[11px] text-red-500 mt-1">
                  {cardErrors.expiry}
                </p>
              )}
            </div>
            <div>
              <input
                value={cardForm.cvv}
                onChange={(e) =>
                  setCardForm({
                    ...cardForm,
                    cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                  })
                }
                placeholder="CVV"
                className={inputCls(cardErrors.cvv)}
                maxLength={4}
                type="password"
              />
              {cardErrors.cvv && (
                <p className="text-[11px] text-red-500 mt-1">
                  {cardErrors.cvv}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="material-symbols-outlined text-slate-400"
              style={{ fontSize: "16px" }}
            >
              lock
            </span>
            <p className="text-[11px] text-slate-400">
              Your payment info is encrypted and secure.
            </p>
          </div>
        </div>
      )}

      {/* Wallet form */}
      {method === "wallet" && (
        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Select Wallet
          </p>
          <div className="grid grid-cols-2 gap-2">
            {WALLET_PROVIDERS.map((wp) => (
              <button
                key={wp.id}
                onClick={() => setWalletProvider(wp.id)}
                className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold text-left transition-all ${
                  walletProvider === wp.id
                    ? "border-[#FF4B19] bg-[#FF4B19]/5"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                } ${wp.color}`}
              >
                {wp.label}
              </button>
            ))}
          </div>
          <div>
            <input
              type="tel"
              value={walletNumber}
              onChange={(e) =>
                setWalletNumber(e.target.value.replace(/\D/g, "").slice(0, 11))
              }
              placeholder="Your wallet mobile number"
              className={inputCls()}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              You'll receive a payment request on this number.
            </p>
          </div>
        </div>
      )}

      {/* COD note */}
      {method === "cod" && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
          <span
            className="material-symbols-outlined text-amber-500 shrink-0 mt-0.5"
            style={{ fontSize: "18px" }}
          >
            info
          </span>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Please have{" "}
            <span className="font-bold">
              EGP {total.toLocaleString("en-EG")}
            </span>{" "}
            ready in cash at the time of delivery.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-slate-400 transition-all"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "18px" }}
          >
            arrow_back
          </span>
          Back
        </button>
        <button
          onClick={handlePlace}
          disabled={placing}
          className="flex-1 py-3.5 bg-[#FF4B19] hover:bg-[#e03d0f] disabled:opacity-60 text-white font-black rounded-2xl shadow-lg shadow-[#FF4B19]/20 transition-colors flex items-center justify-center gap-2"
        >
          {placing ? (
            <>
              <span
                className="material-symbols-outlined animate-spin"
                style={{ fontSize: "20px" }}
              >
                progress_activity
              </span>
              Placing Order…
            </>
          ) : (
            <>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "20px" }}
              >
                lock
              </span>
              Place Order · EGP {total.toLocaleString("en-EG")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Success Screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  orderId,
  method,
  delivery,
}: {
  orderId: string;
  method: PaymentMethod;
  delivery: DeliveryForm;
}) {
  const methodLabel =
    method === "cod"
      ? "Cash on Delivery"
      : method === "card"
        ? "Credit / Debit Card"
        : "Mobile Wallet";
  const methodIcon =
    method === "cod"
      ? "payments"
      : method === "card"
        ? "credit_card"
        : "account_balance_wallet";

  return (
    <div className="flex flex-col items-center text-center py-6 px-4">
      {/* Animated check */}
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-5 animate-bounce-once">
        <span
          className="material-symbols-outlined text-green-500"
          style={{ fontSize: "42px" }}
        >
          check_circle
        </span>
      </div>

      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
        Order Placed!
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Thanks, {delivery.firstName}! We've received your order.
      </p>

      {/* Order card */}
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden text-left mb-6">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">
            Order ID
          </span>
          <span className="text-sm font-black text-[#FF4B19]">{orderId}</span>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-700">
          <div className="px-5 py-3 flex items-center gap-3">
            <span
              className="material-symbols-outlined text-slate-400"
              style={{ fontSize: "18px" }}
            >
              local_shipping
            </span>
            <div>
              <p className="text-xs text-slate-400">Delivering to</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {delivery.city}, {delivery.governorate}
              </p>
              <p className="text-xs text-slate-500">{delivery.address}</p>
            </div>
          </div>
          <div className="px-5 py-3 flex items-center gap-3">
            <span
              className="material-symbols-outlined text-slate-400"
              style={{ fontSize: "18px" }}
            >
              {methodIcon}
            </span>
            <div>
              <p className="text-xs text-slate-400">Payment</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {methodLabel}
              </p>
            </div>
          </div>
          <div className="px-5 py-3 flex items-center gap-3">
            <span
              className="material-symbols-outlined text-slate-400"
              style={{ fontSize: "18px" }}
            >
              schedule
            </span>
            <div>
              <p className="text-xs text-slate-400">Estimated delivery</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                3 – 5 business days
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-6">
        A confirmation SMS will be sent to{" "}
        <span className="font-bold text-slate-600 dark:text-slate-300">
          {delivery.phone}
        </span>
      </p>

      <div className="flex gap-3 w-full max-w-sm">
        <Link
          href="/parts"
          className="flex-1 py-3 text-center text-sm font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-slate-400 transition-all"
        >
          Continue Shopping
        </Link>
        <Link
          href="/garage"
          className="flex-1 py-3 text-center text-sm font-bold text-white bg-[#FF4B19] rounded-2xl hover:opacity-90 transition-all"
        >
          My Garage
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const { items, isHydrated, clearCart } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("delivery");
  const [orderId, setOrderId] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [delivery, setDelivery] = useState<DeliveryForm>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    governorate: "",
    city: "",
    address: "",
    apartment: "",
    notes: "",
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [walletProvider, setWalletProvider] =
    useState<WalletProvider>("vodafone");
  const [walletNumber, setWalletNumber] = useState("");
  const [cardForm, setCardForm] = useState<CardForm>({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
  });

  // Redirect to parts if cart is empty (after hydration)
  useEffect(() => {
    if (isHydrated && items.length === 0 && step !== "success") {
      router.replace("/parts");
    }
  }, [isHydrated, items.length, step, router]);

  async function handlePlaceOrder() {
    setPlacing(true);
    setOrderError(null);

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const shippingFee = subtotal >= 500 ? 0 : 50;
    const total = subtotal + shippingFee;

    const { orderId: savedId, error } = await saveOrder(
      {
        userId: user?.id ?? null,
        deliveryName: `${delivery.firstName} ${delivery.lastName}`.trim(),
        deliveryPhone: delivery.phone,
        deliveryAddress: `${delivery.address}${delivery.apartment ? ", " + delivery.apartment : ""}`,
        deliveryCity: `${delivery.city}, ${delivery.governorate}`,
        paymentMethod,
        notes: delivery.notes || null,
        subtotal,
        shippingFee,
        discount: 0,
        promoCode: null,
        total,
      },
      items,
    );

    if (error || !savedId) {
      setOrderError("Failed to place order. Please try again.");
      setPlacing(false);
      return;
    }

    clearCart();
    setOrderId(savedId);
    setStep("success");
    setPlacing(false);
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span
          className="material-symbols-outlined text-[#FF4B19] animate-spin"
          style={{ fontSize: "36px" }}
        >
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      {/* ── Top bar ── */}
      <div className="bg-white dark:bg-[#111621] border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img
              src="/motorlogo.png"
              alt="Garage Egypt"
              className="h-20 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px" }}
            >
              lock
            </span>
            Secure Checkout
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        {step !== "success" && (
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
            <Link href="/" className="hover:text-[#FF4B19] transition-colors">
              Home
            </Link>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "14px" }}
            >
              chevron_right
            </span>
            <Link
              href="/parts"
              className="hover:text-[#FF4B19] transition-colors"
            >
              Parts
            </Link>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "14px" }}
            >
              chevron_right
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              Checkout
            </span>
          </nav>
        )}

        {step === "success" ? (
          /* ── Success ── */
          <div className="max-w-lg mx-auto">
            <SuccessScreen
              orderId={orderId}
              method={paymentMethod}
              delivery={delivery}
            />
          </div>
        ) : (
          /* ── Two-column layout ── */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
            {/* Left — form */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-6">
                Checkout
              </h1>
              <StepIndicator step={step} />

              {step === "delivery" && (
                <DeliveryStep
                  form={delivery}
                  onChange={setDelivery}
                  onNext={() => setStep("payment")}
                />
              )}

              {step === "payment" && (
                <>
                  {orderError && (
                    <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                      <span
                        className="material-symbols-outlined shrink-0"
                        style={{ fontSize: "18px" }}
                      >
                        error
                      </span>
                      {orderError}
                    </div>
                  )}
                  <PaymentStep
                    method={paymentMethod}
                    setMethod={setPaymentMethod}
                    walletProvider={walletProvider}
                    setWalletProvider={setWalletProvider}
                    walletNumber={walletNumber}
                    setWalletNumber={setWalletNumber}
                    cardForm={cardForm}
                    setCardForm={setCardForm}
                    onBack={() => setStep("delivery")}
                    onPlace={handlePlaceOrder}
                    placing={placing}
                  />
                </>
              )}
            </div>

            {/* Right — order summary (sticky) */}
            <div className="lg:sticky lg:top-24">
              <OrderSummary />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
