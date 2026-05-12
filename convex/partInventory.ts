import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type DbCtx = QueryCtx | MutationCtx;

export async function sumInBinsForPart(
  ctx: DbCtx,
  partId: Id<"parts">
): Promise<number> {
  const rows = await ctx.db
    .query("bin_items")
    .withIndex("by_part", (q) => q.eq("partId", partId))
    .collect();
  return rows.reduce((s, r) => s + r.quantity, 0);
}

/**
 * Adjust unbinned `parts.quantity` and append `inventory_history`.
 * Used by `parts.updateQuantity` and bin transfers.
 */
export async function applyUnbinnedQuantityChange(
  ctx: MutationCtx,
  partId: Id<"parts">,
  change: number,
  reason: string
): Promise<number> {
  const part = await ctx.db.get(partId);
  if (!part) throw new Error("Part not found");
  const newQuantity = part.quantity + change;
  if (newQuantity < 0) {
    throw new Error("Insufficient unbinned stock");
  }
  await ctx.db.patch(partId, { quantity: newQuantity });
  await ctx.db.insert("inventory_history", {
    partId,
    change,
    timestamp: Date.now(),
    reason,
  });
  return newQuantity;
}
