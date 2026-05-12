import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  parts: defineTable({
    name: v.string(),
    quantity: v.number(),
    category: v.string(), // "Mechanical", "Electrical", etc.
    description: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")), // G-code file reference
    vendor: v.string(),
    productCode: v.optional(v.string()),
    stepFileId: v.optional(v.id("_storage")),
    tags: v.array(v.string()),
  })
    .searchIndex("search_name", { searchField: "name" })
    .index("by_vendor_and_productCode", ["vendor", "productCode"])
    .index("by_productCode", ["productCode"]),

  inventory_history: defineTable({
    partId: v.id("parts"),
    change: v.number(), // positive or negative
    timestamp: v.number(),
    reason: v.optional(v.string()),
  }).index("by_part", ["partId"]),

  syncedOrders: defineTable({
    uniqueIdentifier: v.string(),
    productCode: v.string(),
    quantity: v.number(),
    partId: v.id("parts"),
    rowIndex: v.number(),
  }).index("by_uniqueIdentifier", ["uniqueIdentifier"]),

  bins: defineTable({
    name: v.string(),
    color: v.string(),
  }),

  bin_items: defineTable({
    binId: v.id("bins"),
    partId: v.id("parts"),
    quantity: v.number(),
  })
    .index("by_bin", ["binId"])
    .index("by_bin_and_part", ["binId", "partId"])
    .index("by_part", ["partId"]),
});
