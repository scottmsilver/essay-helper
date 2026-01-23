const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {defineSecret, defineString} = require("firebase-functions/params");
const {Resend} = require("resend");

// Secrets (stored securely, not in code)
const resendApiKey = defineSecret("RESEND_API_KEY");

// Configuration parameters
const appUrl = defineString("APP_URL", {
  default: "https://essay-helper.fly.dev",
  description: "The base URL of the Essay Helper application",
});

const senderEmail = defineString("SENDER_EMAIL", {
  default: "noreply@yourdomain.com",
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
      secrets: [resendApiKey],
    },
    async (event) => {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No data in snapshot");
        return;
      }

      const data = snapshot.data();
      const recipientEmail = decodeURIComponent(event.params.recipientEmail);

      // Skip if email notification was already attempted
      if (data.emailStatus) {
        console.log(`Email already processed for ${recipientEmail}, status: ${data.emailStatus}`);
        return;
      }

      const resend = new Resend(resendApiKey.value());
      const essayUrl = `${appUrl.value()}/essay/${data.essayId}`;

      const sharerName = data.ownerDisplayName || data.ownerEmail || "Someone";
      const essayTitle = data.title || "Untitled Essay";
      const accessLevel = data.permission === "editor" ? "Can edit" : "View only";

      try {
        await resend.emails.send({
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
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb; margin-bottom: 24px;">${sharerName} shared an essay with you</h2>

              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px 0;"><strong>Essay:</strong> ${essayTitle}</p>
                <p style="margin: 0;"><strong>Your access:</strong> ${accessLevel}</p>
              </div>

              <a href="${essayUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Open Essay</a>

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

        console.log(`Email sent successfully to ${recipientEmail}`);
        await snapshot.ref.update({
          emailStatus: "sent",
          emailSentAt: new Date(),
        });
      } catch (error) {
        console.error("Failed to send email:", error);
        await snapshot.ref.update({
          emailStatus: "failed",
          emailError: error.message,
        });
      }
    },
);
