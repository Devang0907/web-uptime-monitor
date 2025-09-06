import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_PUBLIC_KEY } from "../config/config";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.headers['authorization'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, JWT_PUBLIC_KEY);
        if (!decoded || !decoded.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        req.userId = decoded.sub as string;

        next()
    }
    catch(error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.headers['authorization'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, JWT_PUBLIC_KEY);
        if (!decoded || !decoded.sub || decoded.sub !== "admin") {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        next()
    }
    catch(error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Unauthorized' });
    }
}