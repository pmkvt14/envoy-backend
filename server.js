const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("ok");
});

app.post("/validate", (req, res) => {
  const minutes = Number(req.body.allowed_minutes);

  if (!Number.isInteger(minutes)) {
    return res.status(400).json({
      error: "allowed_minutes must be an integer"
    });
  }

  if (minutes < 0 || minutes > 180) {
    return res.status(400).json({
      error: "allowed_minutes must be between 0 and 180"
    });
  }

  res.json({ allowed_minutes: minutes });
});

app.post("/events", (req, res) => {
  console.log("EVENT RECEIVED:");
  console.log(req.body);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
