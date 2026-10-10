"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { ASSET_CATEGORIES, ASSET_CATEGORY_LABELS } from "@/lib/categories";
import { addAsset, updateAsset } from "./actions";

export type AssetFormValues = {
  id: string;
  name: string;
  category: string;
  currentValue: number;
};

export function AssetForm({
  mode = "add",
  initial,
  trigger,
}: {
  mode?: "add" | "edit";
  initial?: AssetFormValues;
  trigger?: (open: () => void) => React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "CASH");
  const [currentValue, setCurrentValue] = useState(initial?.currentValue ?? 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = { name, category: category as (typeof ASSET_CATEGORIES)[number], currentValue };
      if (mode === "edit" && initial) {
        await updateAsset(initial.id, payload);
      } else {
        await addAsset(payload);
      }
      setOpen(false);
      if (mode === "add") {
        setName("");
        setCurrentValue(0);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          + Add asset
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={mode === "edit" ? "Edit asset" : "Add asset"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="assetName">Name</Label>
            <Input id="assetName" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC savings account" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assetCategory">Category</Label>
              <Select id="assetCategory" value={category} onChange={(e) => setCategory(e.target.value)}>
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {ASSET_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="assetValue">Current value</Label>
              <Input
                id="assetValue"
                type="number"
                min={0}
                step="0.01"
                required
                value={currentValue}
                onChange={(e) => setCurrentValue(Number(e.target.value))}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : mode === "edit" ? "Save changes" : "Add asset"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
