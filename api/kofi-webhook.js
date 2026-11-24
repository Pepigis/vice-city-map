// api/kofi-webhook.js
// Receives Ko-fi donation webhooks and saves valid donations to Supabase.

export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Accepts "@name - Plot #0042", "@name plot 42", etc.
function parseHandle(message) {
  const match = message.match(/@([A-Za-z0-9_.]{2,32})/);
  return match ? `@${match[1]}` : null;
}

function parsePlot(message) {
  const match = message.match(/plot\s*#?\s*(\d{1,4})/i);
  if (!match) return null;
  const plot = parseInt(match[1], 10);
  return plot >= 1 && plot <= 1600 ? plot : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "");
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const kofiToken = (process.env.KOFI_VERIFICATION_TOKEN || "").trim();

  if (!supabaseUrl || !serviceKey || !kofiToken) {
    console.error("Missing environment variables");
    return res.status(500).send("Server not configured");
  }

  try {
    const raw = await readRawBody(req);
    const params = new URLSearchParams(raw);
    const payload = params.get("data");
    if (!payload) {
      console.error("No data field in request");
      return res.status(400).send("Missing data");
    }

    const event = JSON.parse(payload);

    if ((event.verification_token || "").trim() !== kofiToken) {
      console.error("Verification token mismatch");
      return res.status(401).send("Invalid token");
    }

    if (event.type !== "Donation") {
      return res.status(200).send("Ignored event type");
    }

    const amount = parseFloat(event.amount);
    const message = (event.message || "").trim();
    const handle =
      parseHandle(message) ||
      `@${(event.from_name || "anonymous").replace(/\s+/g, "_")}`;
    const plot = parsePlot(message);

    if (!amount || amount < 1) {
      return res.status(200).send("Amount too small");
    }

    const row = {
      kofi_transaction_id: event.kofi_transaction_id,
      plot,
      name: handle,
      amount,
      message: message.slice(0, 280),
      status: plot ? "active" : "needs_plot",
    };

    const headers = {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Prefer: "return=minimal",
    };

    // Legacy JWT service_role keys require Authorization Bearer; new sb_secret_ keys use only apikey
    if (serviceKey.startsWith("eyJ")) {
      headers.Authorization = `Bearer ${serviceKey}`;
    }

    const supabaseRes = await fetch(`${supabaseUrl}/rest/v1/donors`, {
      method: "POST",
      headers,
      body: JSON.stringify(row),
    });

    if (supabaseRes.status === 409) {
      console.warn("Duplicate or taken plot", { plot, handle, id: event.kofi_transaction_id });
      return res.status(200).send("Duplicate or taken plot");
    }

    if (!supabaseRes.ok) {
      const text = await supabaseRes.text();
      console.error("Supabase insert failed", supabaseRes.status, text);
      return res.status(500).send(`Database error (${supabaseRes.status}): ${text}`);
    }

    console.log("Donation saved", { plot, handle, amount });
    return res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error", err);
    return res.status(400).send("Bad request");
  }
}