// backend/src/config/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Load environment variables before configuring Cloudinary
dotenv.config();

const configureCloudinary = (): void => {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if (cloudinaryUrl) {
    // Cloudinary SDK automatically picks up CLOUDINARY_URL from process.env if available,
    // but we can parse or explicitly set it for maximum config safety.
    try {
      cloudinary.config();
      console.log("[Cloudinary Connection] Configured successfully using CLOUDINARY_URL");
    } catch (err: any) {
      console.error("[Cloudinary Error] Failed to initialize via CLOUDINARY_URL:", err.message);
    }
  } else {
    // Fallback parsing of individual variables if URL is parsed out
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      console.log("[Cloudinary Connection] Configured successfully via manual components");
    } else {
      console.warn(
        "[Cloudinary Warning] No Cloudinary credentials found. Media uploads might fail until CLOUDINARY_URL is configured."
      );
    }
  }
};

configureCloudinary();

export default cloudinary;
