/**
 * Vendor register — material suppliers the practice sources from. Distinct from
 * contractors (who execute work) and consultants (who design). Vendor price
 * records build a historical rate book per vendor / material — the seed for the
 * KB vendor-rate resolution ladder.
 */
import {
  boolean,
  createdAt,
  date,
  id,
  integer,
  pgTable,
  text,
  updatedAt,
  uuid,
} from "./_helpers.js";
import { users } from "./org-auth.js";
import { kbMaterials } from "./knowledge-bank.js";

export const vendors = pgTable("esti_vendor", {
  id: id(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  companyName: text("company_name"),
  contactPerson: text("contact_person"),
  gstin: text("gstin"),
  pan: text("pan"),
  email: text("email"),
  phone: text("phone"),
  city: text("city"),
  state: text("state"),
  active: boolean("active").notNull().default(true),
  qualityRating: integer("quality_rating"),
  reliabilityRating: integer("reliability_rating"),
  pricingRating: integer("pricing_rating"),
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** A quotation document received from a vendor — header + line items.
 *  Accepting a quote flows its lines into esti_vendor_price (pricing history). */
export const vendorQuotes = pgTable("esti_vendor_quote", {
  id: id(),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  ref: text("ref").notNull(),
  quoteDate: date("quote_date").notNull(),
  validUntil: date("valid_until"),
  status: text("status").notNull().default("RECEIVED"), // RECEIVED | ACCEPTED | REJECTED
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
});

/** A line of a vendor quotation — material + unit + quoted rate (paise). */
export const vendorQuoteLines = pgTable("esti_vendor_quote_line", {
  id: id(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => vendorQuotes.id, { onDelete: "cascade" }),
  materialId: uuid("material_id").references(() => kbMaterials.id, { onDelete: "set null" }),
  materialName: text("material_name").notNull(),
  unit: text("unit").notNull(),
  ratePaise: integer("rate_paise").notNull().default(0),
  createdAt: createdAt(),
});

/** A recorded price for a material from a vendor at a point in time.
 *  Optional link to a KB material; materialName is always stored for display. */
export const vendorPrices = pgTable("esti_vendor_price", {
  id: id(),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  materialId: uuid("material_id").references(() => kbMaterials.id, {
    onDelete: "set null",
  }),
  materialName: text("material_name").notNull(),
  unit: text("unit").notNull(),
  ratePaise: integer("rate_paise").notNull().default(0),
  effectiveDate: date("effective_date").notNull(),
  source: text("source").notNull().default("MANUAL"), // QUOTE | INVOICE | MANUAL
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
});
