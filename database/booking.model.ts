import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { Event, EventDocument } from './event.model';

// Attributes required to create a Booking
export interface BookingAttrs {
  eventId: Types.ObjectId;
  email: string;
}

// Booking document stored in MongoDB
export interface BookingDocument extends BookingAttrs, Document {
  createdAt: Date;
  updatedAt: Date;
}

// Booking model type
export interface BookingModel extends Model<BookingDocument> {}

const bookingSchema = new Schema<BookingDocument, BookingModel>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true, // optimize lookups by event
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true, // automatically manage createdAt / updatedAt
    strict: true,
  }
);

// Simple, conservative email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pre-save hook: validate email and ensure referenced event exists
bookingSchema.pre<BookingDocument>('save', async function preSave(next) {
  try {
    if (!emailRegex.test(this.email)) {
      throw new Error('Invalid email address');
    }

    // Ensure the referenced event exists before saving the booking
    const eventExists = await Event.exists({ _id: this.eventId });
    if (!eventExists) {
      throw new Error('Referenced event does not exist');
    }

    next();
  } catch (err) {
    next(err as Error);
  }
});

// Secondary index on eventId for faster queries
bookingSchema.index({ eventId: 1 });

export const Booking: BookingModel =
  (mongoose.models.Booking as BookingModel) ||
  mongoose.model<BookingDocument, BookingModel>('Booking', bookingSchema);
