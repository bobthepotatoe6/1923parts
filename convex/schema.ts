import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  parts: defineTable({
    name: v.string(),
    quantity: v.number(),
    category: v.string(), // "Mechanical", "Electrical", etc.
    description: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")), // G-code file reference
  }).searchIndex("search_name", { searchField: "name" }),

  inventory_history: defineTable({
    partId: v.id("parts"),
    change: v.number(), // positive or negative
    timestamp: v.number(),
    reason: v.optional(v.string()),
  }).index("by_part", ["partId"]),
});
