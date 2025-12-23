console.log("RUNNING FILE:", __filename);
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// log every request (method + path)
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.path}`);
  next();
});

app.get("/", (req, res) => res.status(200).send("ok"));

// allow GET probe for validate (Envoy may probe)
app.get("/validate", (req, res) => {
  res.status(200).json({ ok: true, note: "use POST to validate" });
});

// validation endpoint
app.post("/validate", (req, res) => {
  console.log("VALIDATE BODY:", JSON.stringify(req.body, null, 2));
  console.log("VALIDATE HEADERS:", req.headers);

  // Support both shapes:
  // - curl: { max_visit_duration: 60 }
  // - Envoy SDK docs: { envoy: { payload: { max_visit_duration: ... } } }
  const payload = req.body?.envoy?.payload ?? req.body ?? {};
  const raw = payload.max_visit_duration;

  let minutes;

  if (typeof raw === "number") {
    minutes = raw;
  } else if (typeof raw === "object" && raw !== null) {
    minutes = raw.total_minutes ?? raw.minutes ?? raw.value ?? Number(raw);
  } else {
    minutes = Number(raw);
  }

  minutes = Number(minutes);

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

  return res.status(200).json({ max_visit_duration: minutes });
});

// allow GET probes for webhooks too
app.get("/visitor-sign-in", (req, res) => res.status(200).json({ ok: true }));
app.get("/visitor-sign-out", (req, res) => res.status(200).json({ ok: true }));

app.post("/visitor-sign-in", (req, res) => {
  console.log("VISITOR SIGN-IN EVENT RECEIVED:");
  console.log(JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

app.post("/visitor-sign-out", (req, res) => {
  console.log("VISITOR SIGN-OUT EVENT RECEIVED:");
  console.log(JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

app.get("/envoy/snippets/visitor-duration", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json({
    type: "vertical-container",
    content: [
      { type: "heading", size: "large", content: "Visitor Duration Status" },
      { type: "text", content: "Snippet is rendering ✅ (next we will make this dynamic)" }
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
