console.log("RUNNING FILE:", __filename);
const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => res.send("ok"));

//  validation endpoint 
app.post("/validate", (req, res) => {
  console.log("VALIDATE BODY:", JSON.stringify(req.body, null, 2));

  const minutes = Number(req.body.max_visit_duration);

  if (!Number.isFinite(minutes) || !Number.isInteger(minutes)) {
    return res.status(400).json({ error: "max_visit_duration must be an integer" });
  }

  if (minutes < 0 || minutes > 180) {
    return res.status(400).json({ error: "max_visit_duration must be between 0 and 180" });
  }

  return res.status(200).json({ max_visit_duration: minutes });
});

// webhook endpoints for sign-in, sign-out
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
// content snippet endpoint (Invocation URL)
app.get("/envoy/snippets/visitor-duration", (req, res) => {
  res.setHeader("Content-Type", "application/json");

  // For now: simple placeholder UI so you can confirm it renders.
  // Next step: make it dynamic using real event data.
  res.json({
    type: "vertical-container",
    content: [
      { type: "heading", size: "large", content: "Visitor Duration Status" },
      { type: "text", content: "Snippet is rendering ✅ (next we will make this dynamic)" }
    ]
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
