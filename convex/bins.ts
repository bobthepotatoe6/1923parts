import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
        return {
          _id: item._id,
          quantity: item.quantity,
          part: { ...part, stepFileUrl },
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

    const existing = await ctx.db
      .query("bin_items")
      .withIndex("by_bin_and_part", (q) =>
        q.eq("binId", args.binId).eq("partId", args.partId)
      )
      .first();

    const currentInBin = existing?.quantity ?? 0;
    const remaining = part.quantity - currentInBin;
    if (args.quantity > remaining) {
      throw new Error(
        remaining <= 0
          ? `No units left to allocate (${part.quantity} in inventory, all already in this bin).`
          : `Only ${remaining} unit${remaining === 1 ? "" : "s"} can be added to this bin (inventory: ${part.quantity}).`
      );
    }

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

    if (args.quantity <= 0) {
      await ctx.db.delete(args.binItemId);
      return;
    }

    if (args.quantity > part.quantity) {
      throw new Error(
        `Quantity in bin cannot exceed inventory (${part.quantity}).`
      );
    }

    await ctx.db.patch(args.binItemId, { quantity: args.quantity });
  },
});

export const removeBinItem = mutation({
  args: { binItemId: v.id("bin_items") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.binItemId);
  },
});

export const deleteBin = mutation({
  args: { binId: v.id("bins") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("bin_items")
      .withIndex("by_bin", (q) => q.eq("binId", args.binId))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.binId);
  },
});
