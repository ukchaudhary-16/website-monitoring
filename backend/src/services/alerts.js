const nodemailer = require("nodemailer");
const Alert = require("../models/Alert");
const User = require("../models/User");

const FROM = process.env.ALERT_FROM || "DePIN Monitor <alerts@depin.local>";
const APP_URL = (process.env.APP_BASE_URL || process.env.CORS_ORIGIN || "http://localhost:3000").replace(/\/$/, "");

let _transport;
function smtpTransport() {
  if (_transport !== undefined) return _transport;
  if (process.env.SMTP_HOST) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } else {
    _transport = null;
  }
  return _transport;
}

async function sendEmail(to, subject, text) {
  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, text }),
    });
    if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
    return "sent via resend";
  }
  const t = smtpTransport();
  if (t) {
    await t.sendMail({ from: FROM, to, subject, text });
    return "sent via smtp";
  }
  console.log(`[alerts:email:DEV] to=${to} | ${subject}\n${text}`);
  return "logged (no email provider configured)";
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  return "ok";
}

/**
 * Fire a status-change alert for a website across the owner's enabled channels.
 * Called by the settlement worker only after flap-protection confirms the flip.
 */
async function sendStatusAlert({ site, from, to, region }) {
  const user = await User.findById(site.owner);
  if (!user) return;

  const transition = `${from}->${to}`;
  const emoji = to === "down" ? "🔴" : "🟢";
  const subject = `${emoji} ${site.name} is ${to.toUpperCase()}`;
  const body =
    `${site.name} (${site.url}) transitioned ${from} → ${to}` +
    (region ? ` in region ${region}` : "") +
    `\nConfirmed by node consensus at ${new Date().toISOString()}.\n\n` +
    `Dashboard: ${APP_URL}/dashboard/${site._id}`;

  const results = [];
  const a = user.alerts || {};

  if (a.email?.enabled !== false) {
    const to_ = a.email?.address || user.alertEmail || user.email;
    try {
      results.push({ channel: "email", ok: true, detail: await sendEmail(to_, subject, body) });
    } catch (e) {
      results.push({ channel: "email", ok: false, detail: e.message });
    }
  }
  if (a.slack?.enabled && a.slack.webhookUrl) {
    try {
      await postJson(a.slack.webhookUrl, { text: `${subject}\n${body}` });
      results.push({ channel: "slack", ok: true, detail: "ok" });
    } catch (e) {
      results.push({ channel: "slack", ok: false, detail: e.message });
    }
  }
  if (a.webhook?.enabled && a.webhook.url) {
    try {
      await postJson(a.webhook.url, {
        event: "status_change",
        website: { id: site._id, name: site.name, url: site.url },
        transition,
        from,
        to,
        region: region || null,
        at: new Date().toISOString(),
      });
      results.push({ channel: "webhook", ok: true, detail: "ok" });
    } catch (e) {
      results.push({ channel: "webhook", ok: false, detail: e.message });
    }
  }
  if (results.length === 0) results.push({ channel: "console", ok: true, detail: "no channels enabled" });

  await Alert.create({
    website: site._id,
    user: user._id,
    transition,
    fromStatus: from,
    toStatus: to,
    region: region || null,
    channels: results,
  });

  console.log(`[alerts] ${site.name}: ${transition} -> ${results.map((r) => `${r.channel}:${r.ok ? "ok" : "FAIL"}`).join(", ")}`);
}

module.exports = { sendStatusAlert };
