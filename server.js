if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const path = require("path");
const axios = require("axios");

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// EJS setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Home route → renders index.ejs
app.get('/', (req, res) => {
    res.render("index");
});

// Handle signup form submission
app.post("/signup", async (req, res) => {
    const email = req.body.email;

    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    try {
        // 1️⃣ Get SFMC Access Token
        const authResponse = await axios.post(
            `https://${process.env.SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token`,
            {
                grant_type: "client_credentials",
                client_id: process.env.SFMC_CLIENT_ID,
                client_secret: process.env.SFMC_CLIENT_SECRET
            }
        );

        const accessToken = authResponse.data.access_token;

        // 2️⃣ Trigger Journey via Event Definition Key
        await axios.post(
            `https://${process.env.SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/interaction/v1/events`,
            {
                EventDefinitionKey: process.env.SFMC_JOURNEY_EVENT_KEY,
                ContactKey: email, // ✅ Corrected capitalization
                Data: {
                    ContactKey: email,
                    EmailAddress: email,
                    Date: new Date().toISOString() // match your DE column names
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log(`✅ Journey triggered for: ${email}`);
        // res.status(200).json({ success: true, message: "Registration successful!" });
        res.redirect("/");

    } catch (error) {
        console.error("❌ Error triggering Journey:", error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
    }
});

// Start server
const PORT = process.env.PORT || 40000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
