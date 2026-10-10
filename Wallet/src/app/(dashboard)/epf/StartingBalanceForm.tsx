"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { setStartingBalance } from "./actions";

export function StartingBalanceForm({ startingBalance }: { startingBalance: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(startingBalance);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await setStartingBalance({ startingBalance: value });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Set opening balance
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="PF opening balance">
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted">
            The PF balance you had before you started tracking it here. Your current
            balance will be this plus every contribution recorded below.
          </p>
          <div>
            <Label htmlFor="startingBalance">Opening balance</Label>
            <Input
              id="startingBalance"
              type="number"
              min={0}
              step="0.01"
              required
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </div>
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
