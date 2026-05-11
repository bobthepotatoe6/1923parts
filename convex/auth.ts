import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const verifyPassword = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const teamPassword = process.env.TEAM_PASSWORD;
    if (!teamPassword) {
      // If no password is set in the environment, we might reject or accept. 
      // Let's accept for dev, or throw an error indicating setup is needed.
      throw new Error("TEAM_PASSWORD environment variable is not set in Convex dashboard.");
    }
    
    if (args.password === teamPassword) {
      // Return a simple static token or a boolean. 
      // For a shared gate, a boolean is enough, the client can store a flag in localStorage.
      return { success: true, token: "granted_1923" };
    }
    
    return { success: false, error: "Incorrect password" };
  },
});
