import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  contact: text("contact").notNull(),
  password: text("password").notNull(),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: integer("reset_password_expires"),
});

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey().notNull(),
  companyName: text("company_name").notNull(),
  address: text("address").notNull(),
  industries: text("industries").notNull(),
  industriesType: text("industries_type").notNull(),
  gstNumber: text("gst_number").notNull(),
  website: text("website"),
  flag: text("flag", { enum: ["Red", "Yellow", "Green"] }).notNull(),
});

export const contactPersons = sqliteTable("contact_persons", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  contactNo: text("contact_no").notNull(),
  email: text("email").notNull(),
  designation: text("designation").notNull(),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
});

export const certificates = sqliteTable("certificates", {
  id: text("id").primaryKey().notNull(),
  certificateNo: text("certificate_no").notNull(),
  customerName: text("customer_name").notNull(),
  siteLocation: text("site_location").notNull(),
  makeModel: text("make_model").notNull(),
  range: text("range").notNull(),
  serialNo: text("serial_no").notNull(),
  calibrationGas: text("calibration_gas").notNull(),
  gasCanisterDetails: text("gas_canister_details").notNull(),
  dateOfCalibration: text("date_of_calibration").notNull(),
  calibrationDueDate: text("calibration_due_date").notNull(),
  observations: text("observations", { mode: "json" })
    .$type<
      Array<{
        gas: string;
        before: string;
        after: string;
      }>
    >()
    .notNull(),
  engineerName: text("engineer_name").notNull(),
  status: text("status", { enum: ["Checked", "Unchecked"] }).notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),

  companyId: text("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
});

export const models = sqliteTable("models", {
  id: text("id").primaryKey().notNull(),
  model_name: text("model_name").notNull(),
  range: text("range").notNull(),
});

export const engineers = sqliteTable("engineers", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
});

export const serviceEngineers = sqliteTable("service_engineers", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey().notNull(),
  customerName: text("customer_name").notNull(),
  customerLocation: text("customer_location").notNull(),
  contactPerson: text("contact_person").notNull(),
  contactNumber: text("contact_number").notNull(),
  serviceEngineer: text("service_engineer").notNull(),
  date: text("date").notNull(), 
  place: text("place").notNull(),
  placeOptions: text("place_options").notNull(),
  natureOfJob: text("nature_of_job").notNull(),
  reportNo: text("report_no").notNull(),
  makeModelNumberoftheInstrumentQuantity: text(
    "make_model_number_of_the_instrument_quantity"
  ).notNull(),
  serialNumberoftheInstrumentCalibratedOK: text(
    "serial_number_of_the_instrument_calibrated_ok"
  ).notNull(),
  serialNumberoftheFaultyNonWorkingInstruments: text(
    "serial_number_of_the_faulty_non_working_instruments"
  ).notNull(),
  engineerReport: text("engineer_report").notNull(),
  customerReport: text("customer_report").notNull(),

  engineerRemarks: text("engineer_remarks", { mode: "json" })
    .$type<
      Array<{
        serviceSpares: string;
        partNo: string;
        rate: string;
        quantity: string;
        total: string;
        poNo: string;
      }>
    >()
    .notNull(),

  engineerName: text("engineer_name").notNull(),
  status: text("status", { enum: ["checked", "unchecked"] })
    .default("checked")
    .notNull(),
});

export const admin = sqliteTable("admin", {
  id: text("id").primaryKey().notNull(), // Assuming you want a unique identifier
  name: text("name").notNull(),
  contactNumber: text("contact_number").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
});

export const certificate_report = sqliteTable("certificate_report", {
  id: text("id").primaryKey().notNull(),
  certificateNo: text("genrate_num"),
  lastNumber: integer("last_number").default(0), 
});

export const service_report = sqliteTable("service_report", {
  id: text("id").primaryKey().notNull(),
  reportNo: text("genrate_num"), // or rename if needed
  lastNumber: integer("last_number").default(0),
});



export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
