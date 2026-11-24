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

  try {
    const raw = await readRawBody(req);
    const params = new URLSearchParams(raw);
    const payload = params.get("data");
    if (!payload) {
      return res.status(400).send("Missing data");
    }

    const event = JSON.parse(payload);

    // 1. Reject anything that does not carry our secret token
    if (event.verification_token !== process.env.KOFI_WEBHOOK_TOKEN) {
      return res.status(401).send("Invalid token");
    }

    // 2. Only handle one-off donations
    if (event.type !== "Donation") {
      return res.status(200).send("Ignored event type");
    }

    const amount = parseFloat(event.amount);
    const message = (event.message || "").trim();
    const handle = parseHandle(message) || `@${event.from_name || "anonymous"}`.replace(/\s+/g, "_");
    const plot = parsePlot(message);

    if (!amount || amount < 1) {
      return res.status(200).send("Amount too small");
    }

    // If the buyer forgot the plot number, keep the record without a plot.
    // It will not appear on the map until you assign a plot in Supabase.
    const row = {
      kofi_transaction_id: event.kofi_transaction_id,
      plot,
      name: handle,
      amount,
      message: message.slice(0, 280),
      status: plot ? "active" : "needs_plot",
    };

    const supabaseRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/donors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });

    // 409 means the plot is already taken or this transaction was already saved.
    // Return 200 so Ko-fi does not keep retrying. Check the logs for these cases.
    if (supabaseRes.status === 409) {
      console.warn("Duplicate or taken plot", { plot, handle, id: event.kofi_transaction_id });
      return res.status(200).send("Duplicate or taken plot");
    }

    if (!supabaseRes.ok) {
      const text = await supabaseRes.text();
      console.error("Supabase insert failed", supabaseRes.status, text);
      return res.status(500).send("Database error");
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error", err);
    return res.status(400).send("Bad request");
  }
}