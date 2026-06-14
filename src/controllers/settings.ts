import { Request, Response } from "express";
import Settings from "../models/Setting";

export const getSettings = async (_req: Request, res: Response) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    return res.json(settings);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch settings" });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  const allowed = ["platformName", "platformDescription", "logoUrl"];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => allowed.includes(key)),
  );
  try {
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true },
    );
    return res.json(settings);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update settings" });
  }
};
