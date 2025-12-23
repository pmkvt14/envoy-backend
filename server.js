console.log("RUNNING FILE:", __filename);

const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * In-memory demo stores
 * - configByInstall: max minutes per company+location
 * - checkInsByKey: check-in timestamp per visitor/invite key
 */
const configByInstall = new Map();  // key: `${companyId}:${locationId}` -> { maxMinutes }
const checkInsByKey = new Map();    // key: inviteId or visitorId -> Date

function extractCompanyAndLocation(body) {
  const companyId = body?.company?.id ?? body?.envoy?.company?.id ?? null;
  const locationId = body?.location?.id ?? body?.envoy?.location?.id ?? null;
  return { companyId, locationId };
}

function extractKey(body) {
  // Try invite first, then visitor
  return (
    body?.invite?.id ??
    body?.data?.id ??
    body?.visitor?.id ??
    null
  );
}

function extractTimestamp(body) {
  const candidates = [
    body?.occurred_at,
    body?.occurredAt,
    body?.created_at,
    body?.createdAt,
    body?.timestamp,
    body?.data?.attributes?.["created-at"],
    body?.data?.attributes?.created_at
  ];

  for (const c of candidates) {
    if (!c) continue;
    const d = new Date(c);
    if (Number.isFinite(d.getTime())) return d;
  }

  // Fall back to "now" if Envoy doesn’t include an explicit timestamp
  return new Date();
}

function minutesBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / 60000);
}

function getMaxMinutes(companyId, locationId) {
  const key = `${companyId}:${locationId}`;
  return configByInstall.get(key)?.maxMinutes ?? 180;
}

app.get("/", (req, res) => res.send("ok"));

/**
 * Setup validation
 * Envoy sends body with `payload.max_visit_duration`
 */
app.post("/validate", (req, res) => {
  console.log("VALIDATE BODY:", JSON.stringify(req.body, null, 2));

  const raw =
    req.body?.payload?.max_visit_duration ??
    req.body?.max_visit_duration;

  const minutes = Number(raw);

  if (!Number.isFinite(minutes) || !Number.isInteger(minutes)) {
    return res.status(400).json({
      message: "max_visit_duration must resolve to an integer number of minutes"
    });
  }

  if (minutes < 0 || minutes > 180) {
    return res.status(400).json({
      message: "max_visit_duration must be between 0 and 180 minutes"
    });
  }

  const { companyId, locationId } = extractCompanyAndLocation(req.body);
  if (companyId && locationId) {
    const key = `${companyId}:${locationId}`;
    configByInstall.set(key, { maxMinutes: minutes });
    console.log(`Saved maxMinutes=${minutes} for ${key}`);
  } else {
    console.log("Could not extract company/location on validate (ok for demo).");
  }

  // Respond in a way Envoy accepts for setup
  return res.status(200).json({
    payload: { max_visit_duration: minutes }
  });
});

/**
 * Visitor sign-in hook: store check-in timestamp
 */
app.post("/visitor-sign-in", (req, res) => {
  console.log("VISITOR SIGN-IN EVENT RECEIVED:", JSON.stringify(req.body, null, 2));

  const key = extractKey(req.body);
  const ts = extractTimestamp(req.body);

  if (key) {
    checkInsByKey.set(key, ts);
    console.log(`CHECK-IN stored key=${key} at ${ts.toISOString()}`);
  } else {
    console.log("No invite/visitor key found on sign-in (ok for demo).");
  }

  res.json({ ok: true });
});

/**
 * Visitor sign-out hook: compute elapsed minutes + determine overstayed
 */
app.post("/visitor-sign-out", (req, res) => {
  console.log("VISITOR SIGN-OUT EVENT RECEIVED:", JSON.stringify(req.body, null, 2));

  const key = extractKey(req.body);
  const signOutAt = extractTimestamp(req.body);

  const { companyId, locationId } = extractCompanyAndLocation(req.body);

  if (!key) {
    console.log("No invite/visitor key found on sign-out.");
    return res.json({ ok: true });
  }

  const checkInAt = checkInsByKey.get(key);
  if (!checkInAt) {
    console.log(`No check-in found for key=${key}.`);
    return res.json({ ok: true });
  }

  const elapsed = minutesBetween(checkInAt, signOutAt);
  const maxMinutes = (companyId && locationId) ? getMaxMinutes(companyId, locationId) : 180;

  const overstayed = elapsed > maxMinutes;

  if (overstayed) {
    console.log(
      `🚨 OVERSTAYED key=${key}: elapsed=${elapsed}m max=${maxMinutes}m (over by ${elapsed - maxMinutes}m)`
    );
  } else {
    console.log(
      `✅ OK key=${key}: elapsed=${elapsed}m max=${maxMinutes}m (remaining ${maxMinutes - elapsed}m)`
    );
  }

 
  checkInsByKey.delete(key);

  res.json({ ok: true });
});

/**
 * Snippet: simple, no per-visitor context required
 * Shows current configured max duration (if we can determine company/location)
 */
app.get("/envoy/snippets/visitor-duration", (req, res) => {
  res.setHeader("Content-Type", "application/json");

  // If Envoy does NOT pass company/location, we just show a default explanation.
  // If it DOES (sometimes via query params or headers), we can display the real configured max.
  const companyId = req.query.company_id || null;
  const locationId = req.query.location_id || null;

  const maxMinutes =
    (companyId && locationId) ? getMaxMinutes(companyId, locationId) : null;

  const lines = [
    { type: "heading", size: "large", content: "Visitor Duration" },
    {
      type: "text",
      content: maxMinutes
        ? `Max allowed on-site time: ${maxMinutes} minutes`
        : "Max allowed on-site time is configured during setup."
    },
    {
      type: "text",
      content:
        "Overstay is evaluated on visitor sign-out via the event hook (server logs show OK vs OVERSTAYED)."
    }
  ];

  res.json({ type: "vertical-container", content: lines });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
