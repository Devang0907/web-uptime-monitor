import { randomUUIDv7, type ServerWebSocket } from "bun";
import type { IncomingMessage, SignupIncomingMessage } from "./common/types";
import { prismaClient } from "./db/index";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import nacl_util from "tweetnacl-util";
import geoip from "geoip-lite";
import nodemailer from "nodemailer";

type AvailableValidator = {
    validatorId: string;
    socket: ServerWebSocket<unknown>;
    publicKey: string;
    location: string;
};

const availableValidators: AvailableValidator[] = [];

const CALLBACKS: { [callbackId: string]: (data: IncomingMessage) => Promise<void> | void } = {}
const COST_PER_VALIDATION = 100; // in lamports
let missingEmailConfigWarningShown = false;

Bun.serve({
    fetch(req, server) {
        if (server.upgrade(req)) {
            return;
        }
        return new Response("Upgrade failed", { status: 500 });
    },
    port: 8081,
    websocket: {
        async message(ws: ServerWebSocket<unknown>, message: string) {
            const data: IncomingMessage = JSON.parse(message);

            if (data.type === 'signup') {

                const verified = await verifyMessage(
                    `Signed message for ${data.data.callbackId}, ${data.data.publicKey}`,
                    data.data.publicKey,
                    data.data.signedMessage
                );
                if (verified) {
                    await signupHandler(ws, data.data);
                }
            } else if (data.type === 'validate') {
                const callback = CALLBACKS[data.data.callbackId];
                delete CALLBACKS[data.data.callbackId];

                if (!callback) {
                    console.warn(`No callback registered for ${data.data.callbackId}`);
                    return;
                }

                try {
                    await callback(data);
                } catch (err) {
                    console.error(`Validation callback failed for ${data.data.callbackId}:`, err);
                }
            }
        },
        async close(ws: ServerWebSocket<unknown>) {
            const validatorIndex = availableValidators.findIndex(v => v.socket === ws);
            if (validatorIndex !== -1) {
                availableValidators.splice(validatorIndex, 1);
            }
        }
    },
});

async function signupHandler(ws: ServerWebSocket<unknown>, { ip, publicKey, signedMessage, callbackId }: SignupIncomingMessage) {
    const validatorDb = await prismaClient.validator.findFirst({
        where: {
            publicKey,
        },
    });

    if (validatorDb) {
        ws.send(JSON.stringify({
            type: 'signup',
            data: {
                validatorId: validatorDb.id,
                callbackId,
            },
        }));

        availableValidators.push({
            validatorId: validatorDb.id,
            socket: ws,
            publicKey: validatorDb.publicKey,
            location: validatorDb.location,
        });
        return;
    }

    // Given the ip, find the location
    let location = "unknown";
    try {
        if (!isPrivateIP(ip)) {
            const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
            const geo = await geoRes.json() as { country_name?: string; city?: string };

            if (geo && geo.country_name) {
                location = `${geo.city || "Unknown City"}, ${geo.country_name}`;
            }
        }
    } catch (err) {
        console.error("ipapi.co lookup failed:", err);
    }
    // fallback to geoip-lite if still unknown
    if (location === "unknown") {
        const geoLib = geoip.lookup(ip);
        if (geoLib) {
            location = `${geoLib.city || "Unknown City"}, ${geoLib.country}`;
        }
    }

    console.log(`NeW Validator location: ${location}`);
    // Create a new validator
    const validator = await prismaClient.validator.create({
        data: {
            ip,
            publicKey,
            location,
        },
    });

    ws.send(JSON.stringify({
        type: 'signup',
        data: {
            validatorId: validator.id,
            callbackId,
        },
    }));

    availableValidators.push({
        validatorId: validator.id,
        socket: ws,
        publicKey: validator.publicKey,
        location: validator.location,
    });
}

async function verifyMessage(message: string, publicKey: string, signature: string) {
    const messageBytes = nacl_util.decodeUTF8(message);
    const result = nacl.sign.detached.verify(
        messageBytes,
        new Uint8Array(JSON.parse(signature)),
        new PublicKey(publicKey).toBytes(),
    );

    return result;
}

setInterval(async () => {
    const websitesToMonitor = await prismaClient.website.findMany({
        where: {
            disabled: false,
        },
    });

    for (const website of websitesToMonitor) {
        availableValidators.forEach(validator => {
            const callbackId = randomUUIDv7();
            console.log(`Sending validate to ${validator.validatorId} ${website.url}`);
            validator.socket.send(JSON.stringify({
                type: 'validate',
                data: {
                    url: website.url,
                    callbackId,
                    websiteId: website.id
                },
            }));

            CALLBACKS[callbackId] = async (data: IncomingMessage) => {
                if (data.type === 'validate') {
                    const { status, latency, signedMessage } = data.data;
                    const { validatorId } = validator;
                    const verified = await verifyMessage(
                        `Replying to ${callbackId}`,
                        validator.publicKey,
                        signedMessage
                    );
                    if (!verified) {
                        return;
                    }

                    const checkedAt = new Date();

                    await prismaClient.$transaction([
                        prismaClient.websiteTick.create({
                            data: {
                                websiteId: website.id,
                                validatorId,
                                status,
                                latency,
                                createdAt: checkedAt,
                            },
                        }),

                        prismaClient.validator.update({
                            where: { id: validatorId },
                            data: {
                                pendingPayouts: { increment: COST_PER_VALIDATION },
                            },
                        }),
                    ]);

                    if (status === 'Bad') {
                        await notifyWebsiteOwnerOfDowntime({
                            website,
                            validator,
                            latency,
                            checkedAt,
                        });
                    }
                }
            };
        });
    }
}, 60 * 1000);

async function notifyWebsiteOwnerOfDowntime({
    website,
    validator,
    latency,
    checkedAt,
}: {
    website: { id: string; url: string; userId: string };
    validator: AvailableValidator;
    latency: number;
    checkedAt: Date;
}) {
    try {
        const owner = await prismaClient.user.findUnique({
            where: {
                id: website.userId,
            },
            select: {
                email: true,
            },
        });

        if (!owner?.email) {
            console.warn(`No owner email found for website ${website.id}`);
            return;
        }

        await sendDowntimeEmail({
            ownerEmail: owner.email,
            websiteUrl: website.url,
            latency,
            location: validator.location,
            validatorId: validator.validatorId,
            checkedAt,
        });
    } catch (err) {
        console.error(`Failed to send downtime email for website ${website.id}:`, err);
    }
}

async function sendDowntimeEmail({
    ownerEmail,
    websiteUrl,
    latency,
    location,
    validatorId,
    checkedAt,
}: {
    ownerEmail: string;
    websiteUrl: string;
    latency: number;
    location: string;
    validatorId: string;
    checkedAt: Date;
}) {
    const host = Bun.env.SMTP_HOST;
    const port = Number(Bun.env.SMTP_PORT ?? 587);
    const user = Bun.env.SMTP_USER;
    const pass = Bun.env.SMTP_PASS;
    const from = Bun.env.ALERT_EMAIL_FROM;

    if (!host || !user || !pass || !from) {
        if (!missingEmailConfigWarningShown) {
            console.warn("Downtime email alerts are disabled. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and ALERT_EMAIL_FROM in hub/.env.");
            missingEmailConfigWarningShown = true;
        }
        return;
    }

    if (!Number.isFinite(port)) {
        throw new Error(`Invalid SMTP_PORT: ${Bun.env.SMTP_PORT}`);
    }

    const latencyText = formatLatency(latency);
    const checkedAtText = formatCheckedAt(checkedAt);
    const dashboardUrl = getDashboardUrl();
    const subject = `Website down alert: ${websiteUrl}`;
    const text = [
        "Your website is currently marked as down.",
        "",
        `Website: ${websiteUrl}`,
        `Status: Bad`,
        `Latency: ${latencyText}`,
        `Location: ${location}`,
        `Checked at: ${checkedAtText}`,
        ...(dashboardUrl ? ["", `Open dashboard: ${dashboardUrl}`] : []),
    ].join("\n");

    const html = `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
            <h2 style="color: #b42318; margin: 0 0 12px;">Website down alert</h2>

            <p><strong>Website:</strong> ${escapeHtml(websiteUrl)}</p>
            <p><strong>Status:</strong> <span style="color: #b42318;">Bad</span></p>
            <p><strong>Latency:</strong> ${escapeHtml(latencyText)}</p>
            <p><strong>Location:</strong> ${escapeHtml(location)}</p>
            <p><strong>Checked at:</strong> ${escapeHtml(checkedAtText)}</p>

            ${dashboardUrl ? `
                <p style="margin-top: 20px;">
                    <a href="${escapeHtml(dashboardUrl)}" style="background: #155eef; color: #ffffff; padding: 10px 14px; text-decoration: none; border-radius: 6px; display: inline-block;">Open dashboard</a>
                </p>
            ` : ""}

            <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
                This alert was generated automatically by Web Uptime Monitor.
            </p>
        </div>
    `;

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: Bun.env.SMTP_SECURE === "true",
        auth: {
            user,
            pass,
        },
    });

    await transporter.sendMail({
        from,
        to: ownerEmail,
        subject,
        text,
        html,
        ...(Bun.env.ALERT_EMAIL_REPLY_TO ? { replyTo: Bun.env.ALERT_EMAIL_REPLY_TO } : {}),
    });
}

function formatLatency(latency: number) {
    if (!Number.isFinite(latency)) {
        return `${latency} ms`;
    }

    return `${Math.round(latency)} ms`;
}

function formatCheckedAt(checkedAt: Date) {
    const timeZone = Bun.env.ALERT_EMAIL_TIME_ZONE || "Asia/Kolkata";

    try {
        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
            timeZone,
        }).format(checkedAt);
    } catch {
        return checkedAt.toUTCString();
    }
}

function getDashboardUrl() {
    const frontendUrl = Bun.env.FRONTEND_URL?.trim();

    if (!frontendUrl) {
        return null;
    }

    const normalizedFrontendUrl = frontendUrl.replace(/\/+$/, "");
    return normalizedFrontendUrl.endsWith("/dashboard")
        ? normalizedFrontendUrl
        : `${normalizedFrontendUrl}/dashboard`;
}

function escapeHtml(value: string) {
    const htmlEscapes: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    };

    return value.replace(/[&<>"']/g, char => htmlEscapes[char] ?? char);
}

function isPrivateIP(ip: string) {
  return /^10\./.test(ip) ||
         /^127\./.test(ip) ||
         /^192\.168\./.test(ip) ||
         /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
}

console.log("Hub server started on port 8081");
