import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getParts = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string()),
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

    if (args.category) {
      return parts.filter((p) => p.category === args.category);
    }

    return parts;
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

    return { ...part, history, fileUrl };
  },
});

export const addPart = mutation({
  args: {
    name: v.string(),
    quantity: v.number(),
    category: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
    const part = await ctx.db.get(args.id);
    if (!part) throw new Error("Part not found");

    const newQuantity = part.quantity + args.change;
    await ctx.db.patch(args.id, { quantity: newQuantity });

    await ctx.db.insert("inventory_history", {
      partId: args.id,
      change: args.change,
      timestamp: Date.now(),
      reason: args.reason || "Manual update",
    });

    return newQuantity;
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

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
