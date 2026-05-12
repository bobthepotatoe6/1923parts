import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const allocatePart = mutation({
  args: {
    partId: v.id("parts"),
    quantity: v.number(),
    purpose: v.string(),
    allocatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const part = await ctx.db.get(args.partId);
    if (!part) {
      throw new Error("Part not found");
    }

    const allocatedQuantity = part.allocatedQuantity ?? 0;
    const availableQuantity = part.quantity - allocatedQuantity;

    if (args.quantity > availableQuantity) {
      throw new Error(`Insufficient available quantity. Only ${availableQuantity} available.`);
    }

    const newAllocatedQuantity = allocatedQuantity + args.quantity;

    await ctx.db.patch(args.partId, {
      allocatedQuantity: newAllocatedQuantity,
    });

    const allocationId = await ctx.db.insert("allocations", {
      partId: args.partId,
      quantity: args.quantity,
      purpose: args.purpose,
      allocatedBy: args.allocatedBy,
    });

    await ctx.db.insert("inventory_history", {
      partId: args.partId,
      change: -args.quantity,
      timestamp: Date.now(),
      reason: `Allocated ${args.quantity} for ${args.purpose} by ${args.allocatedBy}`,
    });

    return allocationId;
  },
});

export const deleteAllocation = mutation({
  args: {
    id: v.id("allocations"),
  },
  handler: async (ctx, args) => {
    const allocation = await ctx.db.get(args.id);
    if (!allocation) {
      throw new Error("Allocation not found");
    }

    const part = await ctx.db.get(allocation.partId);
    if (part) {
      const currentAllocated = part.allocatedQuantity ?? 0;
      const newAllocated = Math.max(0, currentAllocated - allocation.quantity);
      
      await ctx.db.patch(allocation.partId, {
        allocatedQuantity: newAllocated,
      });

      await ctx.db.insert("inventory_history", {
        partId: allocation.partId,
        change: allocation.quantity,
        timestamp: Date.now(),
        reason: `Reclaimed ${allocation.quantity} from cancelled allocation (${allocation.purpose})`,
      });
    }

    await ctx.db.delete(args.id);
  },
});

export const getAllocationsForPart = query({
  args: {
    partId: v.id("parts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("allocations")
      .withIndex("by_part", (q) => q.eq("partId", args.partId))
      .collect();
  },
});
