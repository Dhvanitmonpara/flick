import { Response } from "express";

function handleError(error: Error | any, res: Response, fallbackMessage: string, duplicationErrorMessage?: string) {
  if (error instanceof Error) {
    if (duplicationErrorMessage && error.name === "MongoServerError" && (error as any).code === 11000) {
      return res.status(400).json({ error: duplicationErrorMessage });
    }
    return res.status(500).json({ error: error.message || fallbackMessage });
  } else {
    return res.status(500).json({ error: fallbackMessage });
  }
}

export default handleError