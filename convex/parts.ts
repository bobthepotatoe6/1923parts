import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import {
  applyUnbinnedQuantityChange,
  sumInBinsForPart,
} from "./partInventory";

export const getParts = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    let partsQuery;

    if (args.search) {
      partsQuery = ctx.db
        .query("parts")
        .withSearchIndex("search_name", (q) =>
          q.search("name", args.search!)
        );
    } else {
      partsQuery = ctx.db.query("parts");
    }

    const parts = await partsQuery.collect();

    let result = parts;

    if (args.category) {
      result = result.filter((p) => p.category === args.category);
    }

    if (args.tags && args.tags.length > 0) {
      result = result.filter((p) =>
        args.tags!.every(tag => p.tags.includes(tag))
      );
    }

    const binItems = await ctx.db.query("bin_items").collect();
    const inBinsByPart = new Map<string, number>();
    for (const row of binItems) {
      const key = row.partId;
      inBinsByPart.set(key, (inBinsByPart.get(key) ?? 0) + row.quantity);
    }

    return await Promise.all(
      result.map(async (p) => {
        const quantityInBins = inBinsByPart.get(p._id) ?? 0;
        const quantityUnbinned = p.quantity;
        return {
          ...p,
          quantityUnbinned,
          quantityInBins,
          quantityTotal: quantityUnbinned + quantityInBins,
          stepFileUrl: p.stepFileId
            ? await ctx.storage.getUrl(p.stepFileId)
            : null,
        };
      })
    );
  },
});

export const getPart = query({
  args: { id: v.id("parts") },
  handler: async (ctx, args) => {
    const part = await ctx.db.get(args.id);
    if (!part) throw new Error("Part not found");
    const history = await ctx.db
      .query("inventory_history")
      .withIndex("by_part", (q) => q.eq("partId", args.id))
      .order("desc")
      .collect();

    let fileUrl = null;
    if (part.fileId) {
      fileUrl = await ctx.storage.getUrl(part.fileId);
    }

    let stepFileUrl = null;
    if (part.stepFileId) {
      stepFileUrl = await ctx.storage.getUrl(part.stepFileId);
    }

    const quantityInBins = await sumInBinsForPart(ctx, args.id);
    const quantityUnbinned = part.quantity;
    const quantityTotal = quantityUnbinned + quantityInBins;

    return {
      ...part,
      quantityUnbinned,
      quantityInBins,
      quantityTotal,
      history,
      fileUrl,
      stepFileUrl,
    };
  },
});

export const addPart = mutation({
  args: {
    name: v.string(),
    quantity: v.number(),
    category: v.string(),
    description: v.optional(v.string()),
    vendor: v.string(),
    productCode: v.optional(v.string()),
    stepFileId: v.optional(v.id("_storage")),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = args.productCode
      ? await ctx.db
          .query("parts")
          .withIndex("by_vendor_and_productCode", (q) =>
            q.eq("vendor", args.vendor).eq("productCode", args.productCode!)
          )
          .first()
      : null;

    if (existing) {
      const patch: Record<string, unknown> = {
        quantity: existing.quantity + args.quantity,
      };
      if (!existing.stepFileId && args.stepFileId) {
        patch.stepFileId = args.stepFileId;
      }
      if (args.tags.length > 0) {
        const merged = Array.from(new Set([...existing.tags, ...args.tags]));
        if (merged.length !== existing.tags.length) {
          patch.tags = merged;
        }
      }
      await ctx.db.patch(existing._id, patch);
      await ctx.db.insert("inventory_history", {
        partId: existing._id,
        change: args.quantity,
        timestamp: Date.now(),
        reason: "Restock via Add Part",
      });
      return existing._id;
    }

    const id = await ctx.db.insert("parts", { ...args });
    await ctx.db.insert("inventory_history", {
      partId: id,
      change: args.quantity,
      timestamp: Date.now(),
      reason: "Initial addition",
    });
    return id;
  },
});

export const updateQuantity = mutation({
  args: {
    id: v.id("parts"),
    change: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await applyUnbinnedQuantityChange(
      ctx,
      args.id,
      args.change,
      args.reason || "Manual update"
    );
  },
});

export const deletePart = mutation({
  args: { id: v.id("parts") },
  handler: async (ctx, args) => {
    const part = await ctx.db.get(args.id);
    if (!part) return null;
    const binRows = await ctx.db
      .query("bin_items")
      .withIndex("by_part", (q) => q.eq("partId", args.id))
      .collect();
    for (const row of binRows) {
      await ctx.db.delete(row._id);
    }
    const history = await ctx.db
      .query("inventory_history")
      .withIndex("by_part", (q) => q.eq("partId", args.id))
      .collect();
    for (const record of history) {
      await ctx.db.delete(record._id);
    }
    await ctx.db.delete(args.id);
    return null;
  },
});

export const attachFile = mutation({
  args: {
    id: v.id("parts"),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { fileId: args.fileId });
  },
});

export const attachStepFile = mutation({
  args: {
    id: v.id("parts"),
    stepFileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { stepFileId: args.stepFileId });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getStepFileUrl = query({
  args: { id: v.id("parts") },
  handler: async (ctx, args) => {
    const part = await ctx.db.get(args.id);
    if (!part || !part.stepFileId) return null;
    const url = await ctx.storage.getUrl(part.stepFileId);
    if (!url) return null;
    return { name: part.name, vendor: part.vendor, productCode: part.productCode ?? null, url };
  },
});

export const findBySku = query({
  args: {
    vendor: v.string(),
    productCode: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.vendor || !args.productCode) return null;
    const match = await ctx.db
      .query("parts")
      .withIndex("by_vendor_and_productCode", (q) =>
        q.eq("vendor", args.vendor).eq("productCode", args.productCode)
      )
      .first();
    if (!match) return null;
    return {
      _id: match._id,
      name: match.name,
      stepFileId: match.stepFileId ?? null,
    };
  },
});

export const checkExistingStepFile = query({
  args: {
    vendor: v.string(),
    productCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.vendor || !args.productCode) return null;
    const match = await ctx.db
      .query("parts")
      .withIndex("by_vendor_and_productCode", (q) =>
        q.eq("vendor", args.vendor).eq("productCode", args.productCode)
      )
      .filter((q) => q.neq(q.field("stepFileId"), undefined))
      .first();
    return match?.stepFileId ?? null;
  },
});

export const processSyncedOrder = internalMutation({
  args: {
    uniqueIdentifier: v.string(),
    productCode: v.string(),
    quantityToAdd: v.number(),
    rowIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const already = await ctx.db
      .query("syncedOrders")
      .withIndex("by_uniqueIdentifier", (q) =>
        q.eq("uniqueIdentifier", args.uniqueIdentifier)
      )
      .first();
    if (already) return { status: "skipped_duplicate" as const };

    const part = await ctx.db
      .query("parts")
      .withIndex("by_productCode", (q) => q.eq("productCode", args.productCode))
      .first();

    if (!part) {
      console.warn(
        `[GoogleSheetsSync] Row ${args.rowIndex}: no part with productCode "${args.productCode}" — skipped, not recorded.`
      );
      return { status: "not_found" as const };
    }

    await ctx.db.patch(part._id, { quantity: part.quantity + args.quantityToAdd });
    await ctx.db.insert("inventory_history", {
      partId: part._id,
      change: args.quantityToAdd,
      timestamp: Date.now(),
      reason: `Google Sheets sync (row ${args.rowIndex})`,
    });

    await ctx.db.insert("syncedOrders", {
      uniqueIdentifier: args.uniqueIdentifier,
      productCode: args.productCode,
      quantity: args.quantityToAdd,
      partId: part._id,
      rowIndex: args.rowIndex,
    });

    return { status: "synced" as const };
  },
});
