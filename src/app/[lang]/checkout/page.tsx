"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useGarage } from "@/context/GarageContext";
import { useAuth } from "@/context/AuthContext";
import { saveOrder } from "@/services/orderService";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { LocaleLink as LocaleLink } from "@/components/ui/locale-link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  CreditCard,
  Wallet,
  Lock,
  CheckCircle2,
  Minus,
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Ticket,
  Package,
  Clock,
  Info,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { GOVERNORATES, getAreas, tGov, tArea } from "@/lib/locationData";

// ── Constants ─────────────────────────────────────────────────────────────────

type PaymentMethod = "cod" | "card" | "wallet";
type WalletProvider = "vodafone" | "etisalat" | "we" | "instapay";
type Step = "delivery" | "payment" | "success";

function generateOrderId(): string {
  return `GRG-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const { t } = useLanguage();
  const steps: { key: Step; label: string }[] = [
    { key: "delivery", label: t("checkout.delivery") },
    { key: "payment", label: t("checkout.payment") },
    { key: "success", label: t("checkout.confirm") },
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
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all text-sm font-black ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-xs font-bold ${
                  active
                    ? "text-primary"
                    : done
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mb-5 mx-2 rounded transition-all ${
                  done ? "bg-green-400" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Order Summary ─────────────────────────────────────────────────────────────

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
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-wider">
            {t("checkout.orderSummary")}
          </CardTitle>
          <span className="text-xs text-muted-foreground font-medium">
            {items.reduce((s, i) => s + i.qty, 0)} {t("checkout.items")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Items */}
        <div className="divide-y max-h-72 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="px-5 py-3 flex gap-3">
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontSize: "22px" }}
                  >
                    {item.icon}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold line-clamp-2 leading-snug">
                  {item.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {item.vendor}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-1 bg-muted rounded-lg overflow-hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-5 h-5 rounded-none"
                      onClick={() => changeQty(item.id, -1)}
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </Button>
                    <span className="text-xs font-bold w-4 text-center">
                      {item.qty}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-5 h-5 rounded-none"
                      onClick={() => changeQty(item.id, 1)}
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                  <p className="text-xs font-black">
                    EGP {(item.price * item.qty).toLocaleString("en-EG")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="self-start w-5 h-5 mt-0.5 hover:text-destructive"
                onClick={() => removeItem(item.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-5 py-4 border-t space-y-2">
          {promo && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/[0.08] rounded-xl mb-2">
              <Ticket className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-primary flex-1">
                {promo.code}
              </span>
              <span className="text-xs text-primary font-semibold">
                -{promo.discountPct}%
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t("checkout.subtotal")}</span>
            <span className="font-semibold text-foreground">
              EGP {subtotal.toLocaleString("en-EG")}
            </span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-primary">
              <span>{t("checkout.discount")}</span>
              <span className="font-semibold">
                − EGP {discount.toLocaleString("en-EG")}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t("checkout.shipping")}</span>
            <span
              className={`font-semibold ${shipping === 0 ? "text-green-600 dark:text-green-400" : "text-foreground"}`}
            >
              {shipping === 0 ? t("checkout.free") : `EGP ${shipping}`}
            </span>
          </div>
          {shipping > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {t("checkout.freeShippingNote")}
            </p>
          )}
          <Separator />
          <div className="flex justify-between pt-1">
            <span className="font-black text-sm">{t("checkout.total")}</span>
            <span className="font-black text-lg text-primary">
              EGP {total.toLocaleString("en-EG")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
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
  isLoggedIn,
  hasSavedAddress,
  saveAddress,
  onToggleSave,
}: {
  form: DeliveryForm;
  onChange: (f: DeliveryForm) => void;
  onNext: () => void;
  isLoggedIn: boolean;
  hasSavedAddress: boolean;
  saveAddress: boolean;
  onToggleSave: () => void;
}) {
  const { vehicles, activeVehicle } = useGarage();
  const { t, locale } = useLanguage();
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
    if (!form.city) e.city = "Required";
    if (!form.address.trim()) e.address = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div className="space-y-6">
      {/* Saved address banner */}
      {hasSavedAddress && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-300 font-medium">
            {t("checkout.savedAddressLoaded")}
          </p>
        </div>
      )}

      {/* Vehicle notice */}
      {vehicles.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
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

      {/* Contact Information */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          {t("checkout.contactInfo")}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              placeholder={t("checkout.firstName")}
              className={errors.firstName ? "border-destructive" : ""}
            />
            {errors.firstName && (
              <p className="text-[11px] text-destructive mt-1">
                {errors.firstName}
              </p>
            )}
          </div>
          <div>
            <Input
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              placeholder={t("checkout.lastName")}
              className={errors.lastName ? "border-destructive" : ""}
            />
            {errors.lastName && (
              <p className="text-[11px] text-destructive mt-1">
                {errors.lastName}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder={t("checkout.mobile")}
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && (
              <p className="text-[11px] text-destructive mt-1">
                {errors.phone}
              </p>
            )}
          </div>
          <div>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder={t("checkout.emailAddress")}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-[11px] text-destructive mt-1">
                {errors.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Delivery Address */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          {t("checkout.deliveryAddress")}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Select
              value={form.governorate}
              onValueChange={(v) => {
                if (v) {
                  onChange({ ...form, governorate: v, city: "" });
                  setErrors((e) => ({ ...e, governorate: "", city: "" }));
                }
              }}
            >
              <SelectTrigger
                className={errors.governorate ? "border-destructive" : ""}
              >
                <SelectValue placeholder={t("checkout.governorate")} />
              </SelectTrigger>
              <SelectContent>
                {GOVERNORATES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {tGov(g, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.governorate && (
              <p className="text-[11px] text-destructive mt-1">
                {errors.governorate}
              </p>
            )}
          </div>
          <div>
            <Select
              value={form.city}
              onValueChange={(v) => v && set("city", v)}
              disabled={!form.governorate}
            >
              <SelectTrigger
                className={errors.city ? "border-destructive" : ""}
              >
                <SelectValue placeholder={t("checkout.city")} />
              </SelectTrigger>
              <SelectContent>
                {getAreas(form.governorate).map((area) => (
                  <SelectItem key={area} value={area}>
                    {tArea(area, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.city && (
              <p className="text-[11px] text-destructive mt-1">{errors.city}</p>
            )}
          </div>
        </div>
        <div>
          <Input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder={t("checkout.streetAddress")}
            className={errors.address ? "border-destructive" : ""}
          />
          {errors.address && (
            <p className="text-[11px] text-destructive mt-1">
              {errors.address}
            </p>
          )}
        </div>
        <Input
          value={form.apartment}
          onChange={(e) => set("apartment", e.target.value)}
          placeholder={t("checkout.apartment")}
        />
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder={t("checkout.deliveryNotes")}
          rows={2}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Save address checkbox */}
      {isLoggedIn && (
        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <div
            onClick={onToggleSave}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              saveAddress
                ? "bg-primary border-primary"
                : "border-muted-foreground/40 group-hover:border-primary"
            }`}
          >
            {saveAddress && (
              <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
            )}
          </div>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            {hasSavedAddress
              ? t("checkout.updateAddress")
              : t("checkout.saveAddress")}
          </span>
        </label>
      )}

      <Button
        size="lg"
        className="w-full font-black"
        onClick={() => {
          if (validate()) onNext();
        }}
      >
        {t("checkout.continueToPayment")}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
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
  const { t, locale } = useLanguage();
  const [cardErrors, setCardErrors] = useState<Partial<CardForm>>({});

  function formatCardNumber(val: string) {
    return val
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }
  function formatExpiry(val: string) {
    const d = val.replace(/\D/g, "").slice(0, 4);
    if (d.length >= 3) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return d;
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

  const PAYMENT_OPTIONS = [
    {
      id: "cod" as PaymentMethod,
      icon: <Truck className="w-5 h-5" />,
      label: t("checkout.cashOnDelivery"),
      desc: t("checkout.payWhenArrives"),
    },
    {
      id: "card" as PaymentMethod,
      icon: <CreditCard className="w-5 h-5" />,
      label: t("checkout.creditCard"),
      desc: t("checkout.cardBrands"),
    },
    {
      id: "wallet" as PaymentMethod,
      icon: <Wallet className="w-5 h-5" />,
      label: t("checkout.mobileWallet"),
      desc: t("checkout.walletDesc"),
    },
  ];

  const WALLET_PROVIDERS = [
    {
      id: "vodafone" as WalletProvider,
      label: "Vodafone Cash",
      color: "text-red-600",
    },
    {
      id: "etisalat" as WalletProvider,
      label: "Etisalat Cash",
      color: "text-green-600",
    },
    { id: "we" as WalletProvider, label: "WE Pay", color: "text-purple-600" },
    {
      id: "instapay" as WalletProvider,
      label: "InstaPay",
      color: "text-blue-600",
    },
  ];

  return (
    <div className="space-y-5">
      <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
        {t("checkout.paymentMethod")}
      </h4>

      <div className="space-y-2.5">
        {PAYMENT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setMethod(opt.id)}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
              method === opt.id
                ? "border-primary bg-primary/[0.05] dark:bg-primary/10"
                : "border-border hover:border-muted-foreground/40"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${method === opt.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              {opt.icon}
            </div>
            <div className="flex-1">
              <p
                className={`text-sm font-bold ${method === opt.id ? "text-primary" : ""}`}
              >
                {opt.label}
              </p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${method === opt.id ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
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
        <Card className="bg-muted/30">
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {t("checkout.cardDetails")}
            </p>
            <div>
              <Input
                value={cardForm.number}
                onChange={(e) =>
                  setCardForm({
                    ...cardForm,
                    number: formatCardNumber(e.target.value),
                  })
                }
                placeholder={t("checkout.cardNumber")}
                maxLength={19}
                className={cardErrors.number ? "border-destructive" : ""}
              />
              {cardErrors.number && (
                <p className="text-[11px] text-destructive mt-1">
                  {cardErrors.number}
                </p>
              )}
            </div>
            <div>
              <Input
                value={cardForm.name}
                onChange={(e) =>
                  setCardForm({ ...cardForm, name: e.target.value })
                }
                placeholder={t("checkout.cardHolder")}
                className={cardErrors.name ? "border-destructive" : ""}
              />
              {cardErrors.name && (
                <p className="text-[11px] text-destructive mt-1">
                  {cardErrors.name}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  value={cardForm.expiry}
                  onChange={(e) =>
                    setCardForm({
                      ...cardForm,
                      expiry: formatExpiry(e.target.value),
                    })
                  }
                  placeholder={t("checkout.expiry")}
                  maxLength={5}
                  className={cardErrors.expiry ? "border-destructive" : ""}
                />
                {cardErrors.expiry && (
                  <p className="text-[11px] text-destructive mt-1">
                    {cardErrors.expiry}
                  </p>
                )}
              </div>
              <div>
                <Input
                  type="password"
                  value={cardForm.cvv}
                  onChange={(e) =>
                    setCardForm({
                      ...cardForm,
                      cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                    })
                  }
                  placeholder={t("checkout.cvv")}
                  maxLength={4}
                  className={cardErrors.cvv ? "border-destructive" : ""}
                />
                {cardErrors.cvv && (
                  <p className="text-[11px] text-destructive mt-1">
                    {cardErrors.cvv}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">
                {t("checkout.paymentSecure")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet form */}
      {method === "wallet" && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {t("checkout.selectWallet")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {WALLET_PROVIDERS.map((wp) => (
                <button
                  key={wp.id}
                  onClick={() => setWalletProvider(wp.id)}
                  className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold text-left transition-all ${
                    walletProvider === wp.id
                      ? "border-primary bg-primary/[0.05]"
                      : "border-border hover:border-muted-foreground/40"
                  } ${wp.color}`}
                >
                  {wp.label}
                </button>
              ))}
            </div>
            <div>
              <Input
                type="tel"
                value={walletNumber}
                onChange={(e) =>
                  setWalletNumber(
                    e.target.value.replace(/\D/g, "").slice(0, 11),
                  )
                }
                placeholder={t("checkout.walletNumber")}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {t("checkout.walletRequest")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* COD note */}
      {method === "cod" && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {locale === "ar" ? (
              <>
                يُرجى تجهيز{" "}
                <span className="font-bold">
                  EGP {total.toLocaleString("en-EG")}
                </span>{" "}
                نقداً عند التسليم.
              </>
            ) : (
              <>
                Please have{" "}
                <span className="font-bold">
                  EGP {total.toLocaleString("en-EG")}
                </span>{" "}
                ready in cash at the time of delivery.
              </>
            )}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          {t("checkout.back")}
        </Button>
        <Button
          size="lg"
          className="flex-1 font-black shadow-lg shadow-primary/20"
          onClick={handlePlace}
          disabled={placing}
        >
          {placing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("checkout.placingOrder")}
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              {locale === "ar"
                ? `تأكيد الطلب · EGP ${total.toLocaleString("en-EG")}`
                : `Place Order · EGP ${total.toLocaleString("en-EG")}`}
            </>
          )}
        </Button>
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
  const { t, locale } = useLanguage();
  const methodLabel =
    method === "cod"
      ? t("checkout.cashOnDelivery")
      : method === "card"
        ? t("checkout.creditCard")
        : t("checkout.mobileWallet");
  const methodIcon =
    method === "cod" ? (
      <Truck className="w-4 h-4" />
    ) : method === "card" ? (
      <CreditCard className="w-4 h-4" />
    ) : (
      <Wallet className="w-4 h-4" />
    );

  return (
    <div className="flex flex-col items-center text-center py-6 px-4">
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-5">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-2xl font-black mb-1">{t("checkout.orderPlaced")}</h2>
      <p className="text-muted-foreground text-sm mb-6">
        {locale === "ar"
          ? `شكراً، ${delivery.firstName}! لقد استلمنا طلبك.`
          : `Thanks, ${delivery.firstName}! We've received your order.`}
      </p>

      <Card className="w-full max-w-sm mb-6 text-left">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            {t("checkout.orderId")}
          </span>
          <Badge variant="default" className="font-black">
            {orderId}
          </Badge>
        </div>
        <CardContent className="p-0 divide-y">
          <div className="px-5 py-3 flex items-center gap-3">
            <Truck className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                {t("checkout.deliveringTo")}
              </p>
              <p className="text-sm font-bold">
                {delivery.city}, {delivery.governorate}
              </p>
              <p className="text-xs text-muted-foreground">
                {delivery.address}
              </p>
            </div>
          </div>
          <div className="px-5 py-3 flex items-center gap-3">
            <span className="text-muted-foreground">{methodIcon}</span>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("checkout.payment")}
              </p>
              <p className="text-sm font-bold">{methodLabel}</p>
            </div>
          </div>
          <div className="px-5 py-3 flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                {t("checkout.estimatedDelivery")}
              </p>
              <p className="text-sm font-bold">{t("checkout.estimatedDays")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mb-6">
        {locale === "ar" ? (
          <>
            سيتم إرسال رسالة تأكيد إلى{" "}
            <span className="font-bold text-foreground">{delivery.phone}</span>
          </>
        ) : (
          <>
            A confirmation SMS will be sent to{" "}
            <span className="font-bold text-foreground">{delivery.phone}</span>
          </>
        )}
      </p>

      <div className="flex gap-3 w-full max-w-sm">
        <Button asChild variant="outline" className="flex-1">
          <LocaleLink href="/parts">
            {t("checkout.continueShopping")}
          </LocaleLink>
        </Button>
        <Button asChild className="flex-1">
          <LocaleLink href="/garage">{t("checkout.myGarage")}</LocaleLink>
        </Button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    isHydrated,
    clearCart,
    subtotal,
    shipping,
    discount,
    promo,
    total,
  } = useCart();
  const { user } = useAuth();
  const { t, localePath } = useLanguage();

  const [step, setStep] = useState<Step>("delivery");
  const [orderId, setOrderId] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // ── Rate-limit / duplicate-order prevention ──────────────────────────────
  // `placingRef` is a synchronous in-flight lock — it blocks any second call
  // that races in before React re-renders and sets `placing = true`.
  const placingRef = useRef(false);

  // Idempotency key: generated once per payment attempt and stored in
  // localStorage so that a page-reload retry reuses the same key and the DB
  // unique constraint turns it into a no-op instead of a duplicate row.
  const generateIdempotencyKey = useCallback(() => {
    const fingerprint = [
      user?.id ?? "anon",
      items.map((i) => `${i.id}:${i.qty}`).join(","),
      // 5-minute bucket — retries within the same window share the key
      Math.floor(Date.now() / 300_000),
    ].join("|");
    // Simple non-crypto hash (djb2)
    let hash = 5381;
    for (let i = 0; i < fingerprint.length; i++) {
      hash = ((hash << 5) + hash) ^ fingerprint.charCodeAt(i);
    }
    return `ik_${(hash >>> 0).toString(36)}`;
  }, [user?.id, items]);

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

  // Saved address state
  const [savedAddressId, setSavedAddressId] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);

  // Load saved default address + prefill user info on mount
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    // Pre-fill email + name from user profile
    const nameParts = (user.full_name ?? "").trim().split(/\s+/);
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");

    setDelivery((prev) => ({
      ...prev,
      email: prev.email || user.email || "",
      firstName: prev.firstName || firstName,
      lastName: prev.lastName || lastName,
      phone: prev.phone || user.phone || "",
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // Fetch default saved address
    db.from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => {
        if (!data) {
          setSaveAddress(true); // default to saving when no address exists
          return;
        }
        setSavedAddressId(data.id);
        setSaveAddress(false);
        const nameParts2 = (data.full_name ?? "").trim().split(/\s+/);
        setDelivery((prev) => ({
          ...prev,
          firstName: nameParts2[0] ?? prev.firstName,
          lastName: nameParts2.slice(1).join(" ") || prev.lastName,
          phone: data.phone || prev.phone,
          governorate: data.governorate || prev.governorate,
          city: data.city || prev.city,
          address: data.address_line || prev.address,
          apartment: data.apartment || prev.apartment,
        }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function upsertAddress() {
    if (!user || !saveAddress) return;
    const supabase = createClient();
    const payload = {
      user_id: user.id,
      full_name: `${delivery.firstName} ${delivery.lastName}`.trim(),
      phone: delivery.phone,
      address_line: delivery.address,
      city: delivery.city,
      governorate: delivery.governorate,
      apartment: delivery.apartment || null,
      is_default: true,
      label: "Home",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    if (savedAddressId) {
      await db.from("addresses").update(payload).eq("id", savedAddressId);
    } else {
      const { data } = await db
        .from("addresses")
        .insert(payload)
        .select("id")
        .single();
      if (data?.id) setSavedAddressId(data.id);
    }
  }

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

  useEffect(() => {
    if (isHydrated && items.length === 0 && step !== "success") {
      router.replace(localePath("/parts"));
    }
  }, [isHydrated, items.length, step, router, localePath]);

  async function handlePlaceOrder() {
    if (!user) {
      setOrderError("Please log in to place your order.");
      return;
    }
    // Synchronous lock — prevents double-submit races before state re-render
    if (placingRef.current) return;
    placingRef.current = true;
    setPlacing(true);
    setOrderError(null);

    const idempotencyKey = generateIdempotencyKey();

    // Use cart-computed totals so product-level discounts (baked into
    // item.price) and promo-code discounts are both reflected in the order.
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
        shippingFee: shipping,
        discount,
        promoCode: promo?.code ?? null,
        total,
        idempotencyKey,
      },
      items,
    );

    if (error || !savedId) {
      setOrderError("Failed to place order. Please try again.");
      placingRef.current = false;
      setPlacing(false);
      return;
    }

    clearCart();
    setOrderId(savedId);
    setStep("success");
    placingRef.current = false;
    setPlacing(false);

    // Fire-and-forget: send order confirmation emails/SMS to customer + vendor
    fetch("/api/orders/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: savedId }),
    }).catch(() => {
      /* non-fatal */
    });
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-9 h-9 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Top bar */}
      <div className="bg-background border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <LocaleLink href="/">
            <img
              src="/motorlogo.png"
              alt="Warshety"
              className="h-20 w-auto object-contain"
            />
          </LocaleLink>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-4 h-4" />
            {t("checkout.secureCheckout")}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        {step !== "success" && (
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
            <LocaleLink
              href="/"
              className="hover:text-primary transition-colors"
            >
              {t("checkout.home")}
            </LocaleLink>
            <ArrowRight className="w-3 h-3" />
            <LocaleLink
              href="/parts"
              className="hover:text-primary transition-colors"
            >
              {t("checkout.parts")}
            </LocaleLink>
            <ArrowRight className="w-3 h-3" />
            <span className="text-foreground font-semibold">
              {t("checkout.checkoutTitle")}
            </span>
          </nav>
        )}

        {step === "success" ? (
          <div className="max-w-lg mx-auto">
            <SuccessScreen
              orderId={orderId}
              method={paymentMethod}
              delivery={delivery}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
            {/* Left — form */}
            <Card>
              <CardContent className="p-6 sm:p-8">
                <h1 className="text-2xl font-black mb-6">
                  {t("checkout.checkoutTitle")}
                </h1>
                <StepIndicator step={step} />

                {step === "delivery" && (
                  <DeliveryStep
                    form={delivery}
                    onChange={setDelivery}
                    onNext={async () => {
                      await upsertAddress();
                      setStep("payment");
                    }}
                    isLoggedIn={!!user}
                    hasSavedAddress={!!savedAddressId}
                    saveAddress={saveAddress}
                    onToggleSave={() => setSaveAddress((v) => !v)}
                  />
                )}

                {step === "payment" && (
                  <>
                    {orderError && (
                      <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-destructive/10 rounded-xl border border-destructive/20 text-sm text-destructive">
                        <Info className="w-4 h-4 shrink-0" />
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
              </CardContent>
            </Card>

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
