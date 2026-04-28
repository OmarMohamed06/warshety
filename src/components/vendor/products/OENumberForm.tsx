"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type OeNumberFormRow } from "@/types/vendor-products";
import { Plus, Trash2, Hash } from "lucide-react";

interface OENumberFormProps {
  oeNumbers: OeNumberFormRow[];
  onChange: (oeNumbers: OeNumberFormRow[]) => void;
}

function emptyRow(): OeNumberFormRow {
  return { _key: crypto.randomUUID(), manufacturer: "", oe_number: "" };
}

/** Groups OE number rows by manufacturer for the display table */
function groupByManufacturer(rows: OeNumberFormRow[]) {
  const map: Record<string, OeNumberFormRow[]> = {};
  for (const row of rows) {
    const key = row.manufacturer.trim() || "Other";
    (map[key] ??= []).push(row);
  }
  return map;
}

export function OENumberForm({ oeNumbers, onChange }: OENumberFormProps) {
  const [newRow, setNewRow] = useState<OeNumberFormRow>(emptyRow);

  function setField(field: keyof OeNumberFormRow, value: string) {
    setNewRow((r) => ({ ...r, [field]: value }));
  }

  function addOeNumber() {
    if (!newRow.oe_number.trim()) return;
    onChange([...oeNumbers, { ...newRow, _key: crypto.randomUUID() }]);
    setNewRow(emptyRow());
  }

  function removeOeNumber(key: string) {
    onChange(oeNumbers.filter((o) => o._key !== key));
  }

  const grouped = groupByManufacturer(oeNumbers);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">OE Numbers</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Add OEM and cross-reference part numbers. Customers often search by OE
          number — each entry improves discoverability.
        </p>
      </div>

      {/* Grouped display */}
      {oeNumbers.length > 0 ? (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {Object.entries(grouped).map(([mfr, rows], gi) => (
            <div
              key={mfr}
              className={gi > 0 ? "border-t border-slate-200" : ""}
            >
              {/* Manufacturer header */}
              <div className="bg-slate-50 px-4 py-2 flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {mfr}
                </span>
              </div>
              {/* OE numbers */}
              <div className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <div
                    key={row._key}
                    className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-slate-50/60"
                  >
                    <span className="font-mono text-sm text-blue-700 font-medium">
                      {row.oe_number}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeOeNumber(row._key)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
          <Hash className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No OE numbers added yet</p>
        </div>
      )}

      {/* Add OE number form */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-700">Add an OE Number</p>
        <div className="flex gap-3 flex-wrap">
          <div className="space-y-1 flex-1 min-w-36">
            <label className="text-xs font-medium text-slate-600">
              Manufacturer
            </label>
            <Input
              value={newRow.manufacturer}
              onChange={(e) => setField("manufacturer", e.target.value)}
              placeholder="e.g. Toyota"
            />
          </div>
          <div className="space-y-1 flex-1 min-w-44">
            <label className="text-xs font-medium text-slate-600">
              OE Number <span className="text-red-500">*</span>
            </label>
            <Input
              value={newRow.oe_number}
              onChange={(e) => setField("oe_number", e.target.value)}
              placeholder="e.g. 04465-02370"
              className="font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOeNumber();
                }
              }}
            />
          </div>
          <div className="self-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOeNumber}
              disabled={!newRow.oe_number.trim()}
              className="gap-1.5 h-9"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Press Enter in the OE Number field to quickly add.
        </p>
      </div>

      {oeNumbers.length > 0 && (
        <p className="text-xs text-slate-400">
          {oeNumbers.length} OE number{oeNumbers.length !== 1 ? "s" : ""} added
        </p>
      )}
    </div>
  );
}
