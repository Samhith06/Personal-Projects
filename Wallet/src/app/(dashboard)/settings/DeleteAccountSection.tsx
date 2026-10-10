"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { deleteAccount } from "./actions";

export function DeleteAccountSection() {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText === "DELETE";

  async function onDelete() {
    if (!canDelete) return;
    setLoading(true);
    setError(null);
    try {
      await deleteAccount();
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        This permanently deletes your account and every record tied to it — income, expenses,
        EPF/PF, investments, goals, assets, and liabilities. This cannot be undone.
      </p>
      <div>
        <Label htmlFor="confirmDelete">
          Type <span className="font-mono text-foreground">DELETE</span> to confirm
        </Label>
        <Input
          id="confirmDelete"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="max-w-xs"
        />
      </div>
      {error ? <p className="text-sm text-negative">{error}</p> : null}
      <Button variant="danger" disabled={!canDelete || loading} onClick={onDelete}>
        {loading ? "Deleting…" : "Permanently delete my account"}
      </Button>
    </div>
  );
}
