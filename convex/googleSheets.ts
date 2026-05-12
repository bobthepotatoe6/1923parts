"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { google } from "googleapis";

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  // Strip a single pair of surrounding quotes (common when pasted from JSON)
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  // Convert literal "\n" escape sequences to real newlines (handles env-var-flattened keys)
  key = key.replace(/\\n/g, "\n");
  // Re-trim any whitespace exposed after unquoting
  return key.trim();
}

export const syncFromSheet = action({
  args: {},
  handler: async (ctx) => {
    const sheetId = process.env.GOOGLE_SHEETS_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    if (!sheetId || !clientEmail || !rawKey) {
      throw new Error(
        "Missing env vars: GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY"
      );
    }

    const privateKey = normalizePrivateKey(rawKey);
    if (!privateKey.includes("BEGIN") || !privateKey.includes("PRIVATE KEY")) {
      throw new Error(
        "GOOGLE_PRIVATE_KEY is not a valid PEM key (missing BEGIN/END markers). " +
          "Set it to the literal value of `private_key` from your service-account JSON " +
          "(starts with '-----BEGIN PRIVATE KEY-----', no surrounding quotes)."
      );
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    let values: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "'Sheet1'!A2:I",
      });
      values = (res.data.values as string[][] | undefined) ?? [];
    } catch (err) {
      console.warn(
        `[GoogleSheetsSync] 'Sheet1' lookup failed, falling back to A2:I:`,
        err
      );
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "A2:I",
      });
      values = (res.data.values as string[][] | undefined) ?? [];
    }

    let synced = 0;
    let skippedDuplicate = 0;
    let notFound = 0;
    let skippedIncomplete = 0;

    for (let i = 0; i < values.length; i++) {
      const row = values[i] ?? [];
      const completed = String(row[0] ?? "").trim().toLowerCase();
      const productCode = String(row[3] ?? "").trim();
      const quantity = Number(String(row[8] ?? "").trim());

      if (completed !== "yes") continue;
      if (!productCode || !Number.isFinite(quantity) || quantity <= 0) {
        skippedIncomplete++;
        continue;
      }

      const sheetRowIndex = i + 2;
      const uniqueIdentifier = `${sheetRowIndex}-${productCode}-${quantity}`;

      const result: { status: "synced" | "skipped_duplicate" | "not_found" } =
        await ctx.runMutation(internal.parts.processSyncedOrder, {
          uniqueIdentifier,
          productCode,
          quantityToAdd: quantity,
          rowIndex: sheetRowIndex,
        });

      if (result.status === "synced") synced++;
      else if (result.status === "skipped_duplicate") skippedDuplicate++;
      else notFound++;
    }

    return { synced, skippedDuplicate, notFound, skippedIncomplete };
  },
});
