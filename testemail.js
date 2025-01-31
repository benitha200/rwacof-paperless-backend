const fetch = require("node-fetch");
require("dotenv").config();
const { ClientSecretCredential } = require("@azure/identity");

const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const userEmail = process.env.EMAIL_USER;

// Create an OAuth2 credential instance
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

async function getAccessToken() {
  const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
  return tokenResponse.token;
}

async function sendEmailGraph() {
  try {
    const accessToken = await getAccessToken(); // Get OAuth token

    const emailData = {
      message: {
        subject: "Test Email from Microsoft Graph API",
        body: {
          contentType: "Text",
          content: "Hello! This is a test email sent using Microsoft Graph API.",
        },
        toRecipients: [
          {
            emailAddress: {
              address: "kaj@sucafina.com",
            },
          },
        ],
      },
    };

    const response = await fetch(`https://graph.microsoft.com/v1.0/users/${userEmail}/sendMail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (response.ok) {
      console.log("✅ Email sent successfully using Microsoft Graph API!");
    } else {
      console.error("❌ Error sending email:", await response.text());
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

sendEmailGraph();
