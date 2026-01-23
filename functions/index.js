"use strict";

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const { Resend } = require("resend");
const { escapeHtml } = require("./utils");

// Secrets (stored securely, not in code)
const resendApiKey = defineSecret("RESEND_API_KEY");

// Configuration parameters
const appUrl = defineString("APP_URL", {
  default: "https://essay-helper.fly.dev",
  description: "The base URL of the Essay Helper application",
});

const senderEmail = defineString("SENDER_EMAIL", {
  default: "noreply@oursilverfamily.com",
  description: "The email address to send notifications from",
});

const senderName = defineString("SENDER_NAME", {
  default: "Essay Helper",
  description: "The display name for the sender",
});

/**
 * Sends an email notification when an essay is shared with a user.
 * Triggers on document creation in sharedWithMe/{recipientEmail}/essays/{docId}
 */
exports.sendShareNotification = onDocumentCreated(
  {
    document: "sharedWithMe/{recipientEmail}/essays/{docId}",
    database: "essays-paid",
    secrets: [resendApiKey],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      const errorMsg = `No data in snapshot for event: ${JSON.stringify(event.params)}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const data = snapshot.data();
    const recipientEmail = decodeURIComponent(event.params.recipientEmail);

    // Skip if email notification was already attempted
    if (data.emailStatus) {
      console.log(`Email already processed for ${recipientEmail}: ${data.emailStatus}`);
      return;
    }

    console.log(`Sending share notification to ${recipientEmail}`);

    // Validate required fields
    if (!data.essayId) {
      const errorMsg = `Missing essayId in share document for ${recipientEmail}`;
      console.error(errorMsg);
      await snapshot.ref.update({
        emailStatus: "failed",
        emailError: errorMsg,
      });
      return;
    }

    const resend = new Resend(resendApiKey.value());
    const essayUrl = `${appUrl.value()}/essay/${encodeURIComponent(data.essayId)}`;

    // Escape user-provided values to prevent XSS
    const sharerName = escapeHtml(data.ownerDisplayName || data.ownerEmail || "Someone");
    const essayTitle = escapeHtml(data.title || "Untitled Essay");
    const accessLevel = data.permission === "editor" ? "Can edit" : "View only";

    try {
      const response = await resend.emails.send({
        from: `${senderName.value()} <${senderEmail.value()}>`,
        to: recipientEmail,
        subject: `${sharerName} shared an essay with you`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb; margin-bottom: 24px;">${sharerName} shared an essay with you</h2>

              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px 0;"><strong>Essay:</strong> ${essayTitle}</p>
                <p style="margin: 0;"><strong>Your access:</strong> ${accessLevel}</p>
              </div>

              <a href="${essayUrl}" style="display: inline-block; background-color: #2563eb;
                color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px;
                font-weight: 500;">Open Essay</a>

              <p style="margin-top: 32px; font-size: 14px; color: #6b7280;">
                You received this email because ${sharerName} shared an essay with you on Essay Helper.
              </p>
            </body>
            </html>
          `,
        text: `${sharerName} shared an essay with you

Essay: ${essayTitle}
Your access: ${accessLevel}

Open the essay: ${essayUrl}

You received this email because ${sharerName} shared an essay with you on Essay Helper.`,
      });

      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }

      console.log(`Email sent to ${recipientEmail} (${response.data?.id})`);

      // Separate try-catch for Firestore update to avoid marking sent emails as failed
      try {
        await snapshot.ref.update({
          emailStatus: "sent",
          emailSentAt: new Date(),
          emailId: response.data?.id,
        });
      } catch (updateError) {
        const errMsg = updateError instanceof Error ? updateError.message : String(updateError);
        console.error(`Email sent but failed to update status for ${recipientEmail}:`, errMsg);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`Failed to send email to ${recipientEmail}:`, err.message, err.stack);
      try {
        await snapshot.ref.update({
          emailStatus: "failed",
          emailError: err.message,
        });
      } catch (updateError) {
        const updateErrMsg = updateError instanceof Error ? updateError.message : String(updateError);
        console.error(`Failed to update failure status for ${recipientEmail}:`, updateErrMsg);
      }
    }
  }
);
