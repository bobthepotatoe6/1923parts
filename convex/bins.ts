import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  applyUnbinnedQuantityChange,
  sumInBinsForPart,
} from "./partInventory";

export const listBins = query({
  args: {},
  handler: async (ctx) => {
    const bins = await ctx.db.query("bins").collect();
    bins.sort((a, b) => b._creationTime - a._creationTime);
    const withCounts = await Promise.all(
      bins.map(async (bin) => {
        const items = await ctx.db
          .query("bin_items")
          .withIndex("by_bin", (q) => q.eq("binId", bin._id))
          .collect();
        const partCount = items.length;
        const unitCount = items.reduce((sum, row) => sum + row.quantity, 0);
        return { ...bin, partCount, unitCount };
      })
    );
    return withCounts;
  },
});

export const getBinWithItems = query({
  args: { binId: v.id("bins") },
  handler: async (ctx, args) => {
    const bin = await ctx.db.get(args.binId);
    if (!bin) return null;

    const items = await ctx.db
      .query("bin_items")
      .withIndex("by_bin", (q) => q.eq("binId", args.binId))
      .collect();

    const enriched = await Promise.all(
      items.map(async (item) => {
        const part = await ctx.db.get(item.partId);
        if (!part) return null;
        const stepFileUrl = part.stepFileId
          ? await ctx.storage.getUrl(part.stepFileId)
          : null;
        const quantityInBins = await sumInBinsForPart(ctx, item.partId);
        const quantityUnbinned = part.quantity;
        const quantityTotal = quantityUnbinned + quantityInBins;
        const maxQtyInThisBin = item.quantity + quantityUnbinned;
        return {
          _id: item._id,
          quantity: item.quantity,
          part: {
            ...part,
            stepFileUrl,
            quantityInBins,
            quantityUnbinned,
            quantityTotal,
            maxQtyInThisBin,
          },
        };
      })
    );

    return {
      bin,
      items: enriched.filter((row): row is NonNullable<typeof row> => row !== null),
    };
  },
});

export const createBin = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) throw new Error("Bin name is required");
    return await ctx.db.insert("bins", { name, color: args.color });
  },
});

export const addToBin = mutation({
  args: {
    binId: v.id("bins"),
    partId: v.id("parts"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) throw new Error("Quantity must be positive");

    const bin = await ctx.db.get(args.binId);
    if (!bin) throw new Error("Bin not found");

    const part = await ctx.db.get(args.partId);
    if (!part) throw new Error("Part not found");

    if (args.quantity > part.quantity) {
      throw new Error(
        `Only ${part.quantity} unbinned unit${part.quantity === 1 ? "" : "s"} available to move into bins.`
      );
    }

    await applyUnbinnedQuantityChange(
      ctx,
      args.partId,
      -args.quantity,
      `To bin: ${bin.name}`
    );

    const existing = await ctx.db
      .query("bin_items")
      .withIndex("by_bin_and_part", (q) =>
        q.eq("binId", args.binId).eq("partId", args.partId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + args.quantity,
      });
    } else {
      await ctx.db.insert("bin_items", {
        binId: args.binId,
        partId: args.partId,
        quantity: args.quantity,
      });
    }
  },
});

export const updateBinItemQuantity = mutation({
  args: {
    binItemId: v.id("bin_items"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.binItemId);
    if (!row) throw new Error("Bin entry not found");

    const part = await ctx.db.get(row.partId);
    if (!part) throw new Error("Part not found");

    const bin = await ctx.db.get(row.binId);

    if (args.quantity <= 0) {
      await applyUnbinnedQuantityChange(
        ctx,
        row.partId,
        row.quantity,
        bin ? `From bin: ${bin.name} (removed)` : "From bin (removed)"
      );
      await ctx.db.delete(args.binItemId);
      return;
    }

    const delta = args.quantity - row.quantity;
    if (delta > 0) {
      if (delta > part.quantity) {
        throw new Error(
          `Only ${part.quantity} unbinned unit${part.quantity === 1 ? "" : "s"} available to add to this bin.`
        );
      }
      await applyUnbinnedQuantityChange(
        ctx,
        row.partId,
        -delta,
        bin ? `To bin: ${bin.name}` : "To bin"
      );
    } else if (delta < 0) {
      await applyUnbinnedQuantityChange(
        ctx,
        row.partId,
        -delta,
        bin ? `From bin: ${bin.name}` : "From bin"
      );
    }

    await ctx.db.patch(args.binItemId, { quantity: args.quantity });
  },
});

export const removeBinItem = mutation({
  args: { binItemId: v.id("bin_items") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.binItemId);
    if (!row) return null;
    const bin = await ctx.db.get(row.binId);
    await applyUnbinnedQuantityChange(
      ctx,
      row.partId,
      row.quantity,
      bin ? `From bin: ${bin.name} (removed)` : "From bin (removed)"
    );
    await ctx.db.delete(args.binItemId);
    return null;
  },
});

export const deleteBin = mutation({
  args: { binId: v.id("bins") },
  handler: async (ctx, args) => {
    const bin = await ctx.db.get(args.binId);
    const label = bin?.name ?? "bin";

    const items = await ctx.db
      .query("bin_items")
      .withIndex("by_bin", (q) => q.eq("binId", args.binId))
      .collect();

    for (const item of items) {
      await applyUnbinnedQuantityChange(
        ctx,
        item.partId,
        item.quantity,
        `From bin: ${label} (bin deleted)`
      );
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.binId);
  },
});
