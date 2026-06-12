import mongoose, { Schema, Document } from "mongoose";

export interface ISettings extends Document {
  platformName: string;
  platformDescription: string;
  logoUrl: string;
  primaryColor: string;
  allowRegistration: boolean;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    platformName: { type: String, default: "QuizHub" },
    platformDescription: { type: String, default: "Test your web development knowledge" },
    logoUrl: { type: String, default: "" },
    primaryColor: { type: String, default: "#3B82F6" },
    allowRegistration: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISettings>("Settings", SettingsSchema);