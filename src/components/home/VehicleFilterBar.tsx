"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGarage } from "@/hooks";
import { useLanguage } from "@/context/LanguageContext";
import { useCarMakes, useCarModels } from "@/hooks/useCarData";

// ── Chevron icon ──────────────────────────────────────────────────────────────
function ChevronDown() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="shrink-0 text-zinc-400"
    >
      <path
        d="M3 5l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Individual select field ───────────────────────────────────────────────────
function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder: string;
}) {
  return (
    <div className="relative flex flex-1 flex-col gap-0.5 min-w-0">
      <span className="px-3.5 pt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none bg-transparent pb-2 pl-3.5 pr-7 text-sm font-semibold text-foreground outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
          <ChevronDown />
        </div>
      </div>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <div className="my-2 w-px self-stretch bg-border" />;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VehicleFilterBar() {
  const router = useRouter();
  const { addVehicle, setActiveVehicle } = useGarage();
  const { t, localePath } = useLanguage();
  const [selectedMakeId, setSelectedMakeId] = useState("");
  const [selectedMakeName, setSelectedMakeName] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  const { makes, loading: makesLoading } = useCarMakes();
  const { models, loading: modelsLoading } = useCarModels(
    selectedMakeId || null,
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 31 }, (_, i) => {
    const y = String(currentYear - i);
    return { value: y, label: y };
  });

  function handleMakeChange(v: string) {
    const found = makes.find((m) => m.id === v);
    setSelectedMakeId(v);
    setSelectedMakeName(found?.name ?? "");
    setModel("");
    setYear("");
  }

  function saveAndGo(path: string) {
    if (!selectedMakeName) return;
    const id = addVehicle({
      brand: selectedMakeName,
      model,
      year: year ? Number(year) : currentYear,
    });
    setActiveVehicle(id);
    router.push(localePath(path));
  }

  function handleSearch() {
    saveAndGo("/services");
  }

  const canSearch = !!selectedMakeName;

  return (
    <div className="mt-5 w-full max-w-sm">
      {/* Label */}
      <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t("home.vehicleFilterLabel")}
      </p>

      {/* Filter pill */}
      <div className="flex items-stretch overflow-hidden rounded-t-2xl rounded-b-none border border-b-0 border-border bg-background shadow-lg ring-0 transition-shadow focus-within:shadow-xl focus-within:ring-1 focus-within:ring-[#FF4B19]/30">
        {/* Make */}
        <FilterSelect
          label={t("home.make")}
          value={selectedMakeId}
          onChange={handleMakeChange}
          options={makes.map((m) => ({ value: m.id, label: m.name }))}
          disabled={makesLoading}
          placeholder={makesLoading ? "Loading…" : t("home.brandPlaceholder")}
        />

        <Divider />

        {/* Model */}
        <FilterSelect
          label={t("home.model")}
          value={model}
          onChange={setModel}
          options={[...new Map(models.map((m) => [m.name, m])).values()].map(
            (m) => ({ value: m.name, label: m.name }),
          )}
          disabled={!selectedMakeId || modelsLoading}
          placeholder={modelsLoading ? "Loading…" : t("home.modelPlaceholder")}
        />

        <Divider />

        {/* Year */}
        <FilterSelect
          label={t("home.year")}
          value={year}
          onChange={setYear}
          options={years}
          disabled={!model}
          placeholder={t("home.yearPlaceholder")}
        />
      </div>

      {/* Book a Service CTA */}
      <button
        onClick={() => saveAndGo("/services")}
        disabled={!canSearch}
        className="w-full flex items-center justify-center rounded-b-2xl rounded-t-none bg-[#FF4B19] py-2.5 text-[13px] font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#e03d10] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("home.bookAService")}
      </button>
    </div>
  );
}
