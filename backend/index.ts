import express from "express";
import { authMiddleware, adminAuthMiddleware } from "./middleware/middleware";
import { prismaClient } from "./db/index";
import cors from "cors";
import { JWT_PUBLIC_KEY } from "./config/config";
import jwt from "jsonwebtoken";

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

    //TODO: hash password

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

// admin routes
app.post("/api/v1/admin/login", async (req, res) => {
    const passKey = req.body.passKey;
    if (passKey !== process.env.ADMIN_PASSKEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const token = jwt.sign({ sub: "admin" }, JWT_PUBLIC_KEY, { expiresIn: "1d" });

    res.status(200).json({
        token
    });
});

app.get("/api/v1/admin/stats", adminAuthMiddleware, async (req, res) => {

    const users = await prismaClient.user.count();
    const websites = await prismaClient.website.count({
        where:{ disabled: false }
    });
    const validators = await prismaClient.validator.count();
    const amountToPay = await prismaClient.validator.aggregate({
        _sum: {
            pendingPayouts: true
        }
    });

    res.status(200).json({
        users,
        websites,
        validators,
        amountToPay: amountToPay._sum.pendingPayouts || 0
    });
});

app.get("/api/v1/admin/validators", adminAuthMiddleware, async (req, res) => {

    const validators = await prismaClient.validator.findMany();

    res.status(200).json({
        validators
    });
});

app.post("/api/v1/admin/paid", adminAuthMiddleware, async (req, res) => {

    const { validatorId } = req.body;

    const validator = await prismaClient.validator.findFirst({
        where: {
            id: validatorId
        }
    });
    
    if (!validator) {
        return res.status(404).json({ error: "Validator not found" });
    }

    await prismaClient.validator.update({
        where: {
            id: validatorId 
        },
        data: {
            pendingPayouts: 0
        }
    });
    
    res.status(200).json({
        message: "Marked as paid"
    });
});

app.listen(8080, () => {
    console.log("API server is running on port 8080");
});
