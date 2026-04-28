"use client";

/**
 * Branch Managers page — /vendor/branches/[branchId]/managers
 *
 * Allows the vendor OWNER to:
 *  • View all managers assigned to a branch
 *  • Assign a new manager by email (user must already have an account)
 *  • Remove a manager assignment
 *
 * Managers cannot access this page (owner-only UI).
 */

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  assignBranchManager,
  removeBranchManager,
  getBranchManagersList,
} from "@/app/actions/branchManagerActions";
import { getBranch } from "@/services/branchService";
import type { DbBranch } from "@/types/database";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  UserPlus,
  Trash2,
  ShieldCheck,
  Building2,
  ArrowLeft,
  Loader2,
  Users,
  AlertTriangle,
} from "lucide-react";
import { LocaleLink as Link } from "@/components/ui/locale-link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ManagerRow {
  user_id: string;
  branch_id: string;
  role: "owner" | "manager";
  assigned_by: string | null;
  created_at: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BranchManagersPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = use(params);
  const { user, vendor, isLoading: authLoading } = useAuth();
  const { localePath, t } = useLanguage();
  const router = useRouter();

  const [branch, setBranch] = useState<DbBranch | null>(null);
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assign form
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignEmail, setAssignEmail] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  // Remove confirm
  const [removeTarget, setRemoveTarget] = useState<ManagerRow | null>(null);
  const [removing, setRemoving] = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!user || !vendor) return;
    setLoading(true);
    setError(null);

    const [branchData, { data: mgrs, error: mgrsErr }] = await Promise.all([
      getBranch(branchId),
      getBranchManagersList(branchId),
    ]);

    if (!branchData) {
      setError("Branch not found");
      setLoading(false);
      return;
    }

    // Only the vendor owner may manage this page
    if (branchData.vendor_id !== vendor.id) {
      router.replace(localePath("/vendor/branches"));
      return;
    }

    setBranch(branchData);
    if (mgrsErr) {
      setError(mgrsErr);
    } else {
      setManagers(mgrs ?? []);
    }
    setLoading(false);
  }, [branchId, user, vendor, router, localePath]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  // ── Assign ────────────────────────────────────────────────────────────────

  async function handleAssign() {
    if (!assignEmail.trim()) {
      setAssignError("Email is required");
      return;
    }
    setAssigning(true);
    setAssignError(null);
    setAssignSuccess(null);

    const { data, error: err } = await assignBranchManager(
      branchId,
      assignEmail,
    );

    if (err) {
      setAssignError(err);
      setAssigning(false);
      return;
    }

    setAssignSuccess(
      `${data?.user?.email ?? assignEmail} has been assigned as manager.`,
    );
    setAssignEmail("");
    setAssigning(false);
    load();
    setTimeout(() => {
      setShowAssignDialog(false);
      setAssignSuccess(null);
    }, 1800);
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);

    const { error: err } = await removeBranchManager(
      branchId,
      removeTarget.user_id,
    );

    setRemoving(false);
    setRemoveTarget(null);

    if (err) {
      setError(err);
    } else {
      load();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <VendorLayout>
        <div className="p-6 max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </VendorLayout>
    );
  }

  if (error && !branch) {
    return (
      <VendorLayout>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3">
          <Link
            href="/vendor/branches"
            className="mt-0.5 p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Building2 className="h-5 w-5 text-primary shrink-0" />
              <h1 className="text-2xl font-black truncate">
                {branch?.name ?? "Branch"}
              </h1>
              {branch?.is_main && (
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                  Main
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Branch managers &mdash; assign existing users to manage this
              branch
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => {
              setAssignError(null);
              setAssignSuccess(null);
              setAssignEmail("");
              setShowAssignDialog(true);
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Manager
          </Button>
        </div>

        {/* ── Global error banner ──────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Permission info card ─────────────────────────────────────────── */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Manager permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Managers CAN:</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>View bookings (this branch only)</li>
                <li>Update booking status</li>
                <li>Manage customers (this branch)</li>
                <li>Edit services for this branch</li>
                <li>Manage calendar &amp; availability</li>
              </ul>
            </div>
            <div className="space-y-1 mt-3 sm:mt-0">
              <p className="font-semibold text-foreground">Managers CANNOT:</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Access other branches</li>
                <li>Assign or remove users</li>
                <li>Access billing or payments</li>
                <li>Access business-level settings</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* ── Managers list ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Assigned Managers
              {managers.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {managers.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {managers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2 text-muted-foreground">
                <Users className="h-8 w-8 opacity-30" />
                <p className="text-sm">No managers assigned yet.</p>
                <p className="text-xs">
                  Use &ldquo;Assign Manager&rdquo; to add an existing user.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {managers.map((m, idx) => (
                  <div key={m.user_id}>
                    {idx > 0 && <Separator className="my-3" />}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {initials(m.user?.full_name, m.user?.email ?? "")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {m.user?.full_name ?? m.user?.email}
                        </p>
                        {m.user?.full_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {m.user.email}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Assigned{" "}
                          {new Date(m.created_at).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-xs shrink-0 capitalize"
                      >
                        {m.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setRemoveTarget(m)}
                        title="Remove manager"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Assign Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={showAssignDialog}
        onOpenChange={(v) => {
          if (!assigning) setShowAssignDialog(v);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Assign Manager
            </DialogTitle>
            <DialogDescription>
              Enter the email of an existing user to assign them as a manager
              for <strong>{branch?.name}</strong>. The user must already have an
              account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {assignSuccess ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {assignSuccess}
              </div>
            ) : (
              <>
                {assignError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    {assignError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="assign-email">{t("vendor.userEmail")}</Label>
                  <Input
                    id="assign-email"
                    type="email"
                    placeholder="user@example.com"
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAssign()}
                    disabled={assigning}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setShowAssignDialog(false)}
                    disabled={assigning}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAssign} disabled={assigning}>
                    {assigning ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Assign
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Remove confirm ───────────────────────────────────────────────── */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(v: boolean) => {
          if (!removing && !v) setRemoveTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Remove manager?
            </DialogTitle>
            <DialogDescription>
              This will remove{" "}
              <strong>
                {removeTarget?.user?.full_name ?? removeTarget?.user?.email}
              </strong>{" "}
              from <strong>{branch?.name}</strong>. They will immediately lose
              access to this branch. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
