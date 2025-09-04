import express from "express"
import { authMiddleware } from "./middleware/middleware";
import { prismaClient } from "./db/index";
import cors from "cors";
import { Transaction, SystemProgram, Connection } from "@solana/web3.js";
import { JWT_PUBLIC_KEY } from "./config/config";
import jwt from "jsonwebtoken";


const connection = new Connection("https://api.mainnet-beta.solana.com");
const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/v1/signup", async (req, res) => {
    const { email, password } = req.body;

    const existingUser = await prismaClient.user.findFirst({
        where: {
            email
        }
    })

    if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
    }

    const user = await prismaClient.user.create({
        data: {
            email,
            password
        }
    })

    res.status(201).json({
        userId: user.id
    })
})

app.post("/api/v1/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await prismaClient.user.findFirst({
        where: {
            email,
            password
        }
    })

    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ sub: user?.id }, JWT_PUBLIC_KEY, { expiresIn: "1d" });

    res.status(200).json({
        token,
        userId: user.id
    })
})

app.post("/api/v1/website", authMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { url } = req.body;

    const data = await prismaClient.website.create({
        data: {
            userId,
            url
        }
    })

    res.json({
        id: data.id
    })
})

app.get("/api/v1/website/status", authMiddleware, async (req, res) => {
    const websiteId = req.query.websiteId! as unknown as string;
    const userId = req.userId;

    const data = await prismaClient.website.findFirst({
        where: {
            id: websiteId,
            userId,
            disabled: false
        },
        include: {
            ticks: true
        }
    })

    res.json(data)

})

app.get("/api/v1/websites", authMiddleware, async (req, res) => {
    const userId = req.userId!;

    const websites = await prismaClient.website.findMany({
        where: {
            userId,
            disabled: false
        },
        include: {
            ticks: true
        }
    })

    res.json({
        websites
    })
})

app.delete("/api/v1/website/", authMiddleware, async (req, res) => {
    const websiteId = req.body.websiteId;
    const userId = req.userId!;

    await prismaClient.website.update({
        where: {
            id: websiteId,
            userId
        },
        data: {
            disabled: true
        }
    })

    res.status(200).json({
        message: "Deleted website successfully"
    })
})

app.listen(8080, () => {
    console.log("API server is running on port 8080");
});
