import mongoose, { Document, Model, Schema } from "mongoose";

// Attributes required to create or update an Event
export interface EventAttrs {
  title: string;
  slug?: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // 24h time string (HH:mm)
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
}

// Event document stored in MongoDB
export interface EventDocument extends EventAttrs, Document {
  createdAt: Date;
  updatedAt: Date;
}

// Event model type
export interface EventModel extends Model<EventDocument> {}

// Generate a URL-friendly slug from a title
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric chars
    .replace(/\s+/g, "-") // collapse whitespace to single dash
    .replace(/-+/g, "-"); // collapse multiple dashes
};

// Normalize date to an ISO date string (YYYY-MM-DD)
const normalizeDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid event date");
  }

  // Keep only the date part (UTC) for consistency
  return date.toISOString().split("T")[0];
};

// Normalize time to 24h HH:mm format
const normalizeTime = (value: string): string => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (!match) {
    throw new Error("Invalid event time format (expected HH:mm)");
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Invalid event time value");
  }

  const hh = hours.toString().padStart(2, "0");
  const mm = minutes.toString().padStart(2, "0");

  return `${hh}:${mm}`;
};

const eventSchema = new Schema<EventDocument, EventModel>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: { type: [String], required: true },
    organizer: { type: String, required: true, trim: true },
    tags: { type: [String], required: true },
  },
  {
    timestamps: true, // automatically manage createdAt / updatedAt
    strict: true,
  }
);

// Ensure slug is unique
eventSchema.index({ slug: 1 }, { unique: true });

// Pre-save hook: validate required fields, normalize date/time, generate slug
eventSchema.pre<EventDocument>("save", function preSave(next) {
  try {
    // Validate non-empty required string fields
    const requiredStringFields: (keyof EventAttrs)[] = [
      "title",
      "description",
      "overview",
      "image",
      "venue",
      "location",
      "date",
      "time",
      "mode",
      "audience",
      "organizer",
    ];

    for (const field of requiredStringFields) {
      const value = this[field];
      if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Field "${String(field)}" is required`);
      }
    }

    // Validate required array fields
    const requiredArrayFields: (keyof EventAttrs)[] = ["agenda", "tags"];

    for (const field of requiredArrayFields) {
      const value = this[field];
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error(`Field "${String(field)}" must be a non-empty array`);
      }
      if (
        value.some(
          (item) => typeof item !== "string" || item.trim().length === 0
        )
      ) {
        throw new Error(
          `Field "${String(field)}" must contain only non-empty strings`
        );
      }
    }

    // Normalize date and time to consistent formats
    this.date = normalizeDate(this.date);
    this.time = normalizeTime(this.time);

    // Regenerate slug only when title has changed or slug is missing
    if (this.isModified("title") || !this.slug) {
      this.slug = generateSlug(this.title);
    }

    next();
  } catch (err) {
    next(err as Error);
  }
});

export const Event: EventModel =
  (mongoose.models.Event as EventModel) ||
  mongoose.model<EventDocument, EventModel>("Event", eventSchema);
