"use client";

/**
 * RewardUsePage — Vendor-facing page.
 * Accessible via QR scan: /reward/use?code=WRS-XXXXXX
 * Vendor can also type code manually.
 * Shows reward info then lets vendor mark as used.
 */

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

interface RewardInfo {
  code: string;
  isUsed: boolean;
  usedAt: string | null;
  reward: {
    title: string;
    title_ar: string | null;
    description: string | null;
    value: number | null;
    value_type: string;
    category: string;
    type: string;
  };
}

interface Props {
  initialCode?: string;
}

export default function RewardUsePage({ initialCode }: Props) {
  const { role, isLoading } = useAuth();
  const [code, setCode] = useState(initialCode ?? "");
  const [info, setInfo] = useState<RewardInfo | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "found" | "not_found" | "used" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-validate if code provided in URL
  useEffect(() => {
    if (initialCode) validateCode(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const validateCode = async (c: string) => {
    const trimmed = c.toUpperCase().trim();
    if (!trimmed) return;
    setStatus("loading");
    setInfo(null);
    setErrorMsg("");

    const res = await fetch(
      `/api/rewards/validate?code=${encodeURIComponent(trimmed)}`,
    );
    if (!res.ok) {
      setStatus("not_found");
      return;
    }
    const data: RewardInfo = await res.json();
    setInfo(data);
    setStatus(data.isUsed ? "used" : "found");
  };

  const markAsUsed = async () => {
    if (!info) return;
    setStatus("loading");
    const res = await fetch("/api/rewards/use", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: info.code }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMsg(json.error ?? "Failed to mark as used");
    }
  };

  const isVendorOrAdmin =
    !isLoading && role && ["vendor", "admin", "manager"].includes(role);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ScanLine size={28} />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Reward Validation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan QR or enter code manually
          </p>
        </div>

        {/* Code input */}
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WRS-XXXXXX or PART-XXXXXX"
            className="font-mono text-center tracking-widest"
            onKeyDown={(e) => e.key === "Enter" && validateCode(code)}
          />
          <Button
            onClick={() => validateCode(code)}
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Check"
            )}
          </Button>
        </div>

        {/* States */}
        {status === "not_found" && (
          <StatusCard
            icon={<XCircle className="text-destructive" size={32} />}
            title="Code not found"
            description="This code does not exist in our system."
            variant="error"
          />
        )}

        {status === "used" && info && (
          <StatusCard
            icon={<XCircle className="text-destructive" size={32} />}
            title="Already used"
            description={`This code was used on ${info.usedAt ? new Date(info.usedAt).toLocaleDateString() : "a previous date"}.`}
            variant="error"
          />
        )}

        {status === "found" && info && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Valid Code</p>
                <p className="font-mono text-sm text-primary">{info.code}</p>
              </div>
            </div>

            <div className="rounded-xl bg-muted p-3 space-y-1">
              <p className="text-sm font-bold text-foreground">
                {info.reward.title}
              </p>
              {info.reward.description && (
                <p className="text-xs text-muted-foreground">
                  {info.reward.description}
                </p>
              )}
              {info.reward.value && (
                <p className="text-sm font-bold text-primary">
                  {info.reward.value_type === "percent"
                    ? `${info.reward.value}% OFF`
                    : `EGP ${info.reward.value} OFF`}
                </p>
              )}
            </div>

            {isVendorOrAdmin ? (
              <Button className="w-full" onClick={markAsUsed}>
                Mark as Used
              </Button>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Only vendor staff can mark codes as used.
              </p>
            )}
          </div>
        )}

        {status === "success" && (
          <StatusCard
            icon={<CheckCircle2 className="text-green-600" size={32} />}
            title="Reward Applied!"
            description="The code has been marked as used. Apply the discount to the customer."
            variant="success"
          />
        )}

        {status === "error" && (
          <StatusCard
            icon={<XCircle className="text-destructive" size={32} />}
            title="Error"
            description={errorMsg}
            variant="error"
          />
        )}
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  title,
  description,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant: "success" | "error";
}) {
  return (
    <div
      className={`rounded-2xl p-5 text-center space-y-2 ${
        variant === "success"
          ? "bg-green-50 border border-green-200"
          : "bg-destructive/5 border border-destructive/20"
      }`}
    >
      <div className="flex justify-center">{icon}</div>
      <p className="font-bold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
