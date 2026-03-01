# Supabase Auth Email Templates

Paste these into **Supabase Dashboard > Authentication > Email Templates**.

For each template: copy the **Subject** into the Subject field, and the **Body (HTML)** into the Body field.

> **Note:** Supabase template variables like `{{ .ConfirmationURL }}`, `{{ .Token }}`, and `{{ .SiteURL }}` are automatically replaced at send time.

---

## 1. Confirm Signup (Email Verification)

**Subject:**

```
Verify your account - Work Timer 
```

**Body (HTML):**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify your email</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f4; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f5f5f4;">Verify your email to get started with Work Timer</div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="{{ .SiteURL }}" style="text-decoration: none;">
                <img src="https://w-timer.com/logos/WT_logoWithText.png" alt="Work Timer" width="160" style="display: block; width: 160px; height: auto;">
              </a>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e7e5e4; overflow: hidden;">
              <div style="height: 4px; background: linear-gradient(90deg, #6366f1, #818cf8);"></div>
              <div style="padding: 40px 36px;">

                <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #1c1917; line-height: 1.3;">Verify your email address</h1>

                <p style="margin: 0 0 16px; font-size: 15px; color: #44403c; line-height: 1.6;">Thanks for signing up for Work Timer! Please verify your email address to activate your account and start tracking your time.</p>

                <p style="margin: 0 0 16px; font-size: 15px; color: #44403c; line-height: 1.6;">Click the button below to confirm your email:</p>

                <!-- Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                  <tr>
                    <td align="center">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ .ConfirmationURL }}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" fillcolor="#6366f1">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;">Verify Email</center>
                      </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-->
                      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; text-align: center; mso-hide: all;">
                        Verify Email
                      </a>
                      <!--<![endif]-->
                    </td>
                  </tr>
                </table>

                <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;">

                <p style="margin: 0 0 8px; font-size: 13px; color: #78716c; line-height: 1.5;">If you didn't create an account with Work Timer, you can safely ignore this email.</p>

                <p style="margin: 0 0 8px; font-size: 13px; color: #78716c; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin: 0 0 8px; font-size: 12px; color: #6366f1; line-height: 1.5; word-break: break-all;">{{ .ConfirmationURL }}</p>

              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #a8a29e;">
                <a href="{{ .SiteURL }}" style="color: #78716c; text-decoration: none;">w-timer.com</a>
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #a8a29e;">
                Questions? Contact us at
                <a href="mailto:support@w-timer.com" style="color: #6366f1; text-decoration: none;">support@w-timer.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #d6d3d1;">
                &copy; 2026 Work Timer. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Magic Link (Passwordless Login)

**Subject:**

```
Your login link - Work Timer
```

**Body (HTML):**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your login link</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f4; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f5f5f4;">Your one-click login link for Work Timer</div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="{{ .SiteURL }}" style="text-decoration: none;">
                <img src="https://w-timer.com/logos/WT_logoWithText.png" alt="Work Timer" width="160" style="display: block; width: 160px; height: auto;">
              </a>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e7e5e4; overflow: hidden;">
              <div style="height: 4px; background: linear-gradient(90deg, #6366f1, #818cf8);"></div>
              <div style="padding: 40px 36px;">

                <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #1c1917; line-height: 1.3;">Your login link</h1>

                <p style="margin: 0 0 16px; font-size: 15px; color: #44403c; line-height: 1.6;">You requested a magic link to sign in to your Work Timer account. Click the button below to log in instantly &mdash; no password needed.</p>

                <!-- Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                  <tr>
                    <td align="center">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ .ConfirmationURL }}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" fillcolor="#6366f1">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;">Sign In to Work Timer</center>
                      </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-->
                      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; text-align: center; mso-hide: all;">
                        Sign In to Work Timer
                      </a>
                      <!--<![endif]-->
                    </td>
                  </tr>
                </table>

                <!-- Security notice -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 16px;">
                  <tr>
                    <td style="background-color: #fafaf9; border-radius: 8px; padding: 16px; border: 1px solid #e7e5e4;">
                      <p style="margin: 0; font-size: 13px; color: #78716c; line-height: 1.5;">
                        &#128274; This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore it.
                      </p>
                    </td>
                  </tr>
                </table>

                <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;">

                <p style="margin: 0 0 8px; font-size: 13px; color: #78716c; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin: 0 0 8px; font-size: 12px; color: #6366f1; line-height: 1.5; word-break: break-all;">{{ .ConfirmationURL }}</p>

              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #a8a29e;">
                <a href="{{ .SiteURL }}" style="color: #78716c; text-decoration: none;">w-timer.com</a>
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #a8a29e;">
                Questions? Contact us at
                <a href="mailto:support@w-timer.com" style="color: #6366f1; text-decoration: none;">support@w-timer.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #d6d3d1;">
                &copy; 2026 Work Timer. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Reset Password

**Subject:**

```
Reset your password - Work Timer
```

**Body (HTML):**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset your password</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f4; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f5f5f4;">Reset your Work Timer password</div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="{{ .SiteURL }}" style="text-decoration: none;">
                <img src="https://w-timer.com/logos/WT_logoWithText.png" alt="Work Timer" width="160" style="display: block; width: 160px; height: auto;">
              </a>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e7e5e4; overflow: hidden;">
              <div style="height: 4px; background: linear-gradient(90deg, #6366f1, #818cf8);"></div>
              <div style="padding: 40px 36px;">

                <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #1c1917; line-height: 1.3;">Reset your password</h1>

                <p style="margin: 0 0 16px; font-size: 15px; color: #44403c; line-height: 1.6;">We received a request to reset the password for your Work Timer account. Click the button below to choose a new password:</p>

                <!-- Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                  <tr>
                    <td align="center">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ .ConfirmationURL }}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" fillcolor="#6366f1">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;">Reset Password</center>
                      </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-->
                      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; text-align: center; mso-hide: all;">
                        Reset Password
                      </a>
                      <!--<![endif]-->
                    </td>
                  </tr>
                </table>

                <!-- Security notice -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 16px;">
                  <tr>
                    <td style="background-color: #fefce8; border-radius: 8px; padding: 16px; border: 1px solid #fef08a;">
                      <p style="margin: 0; font-size: 13px; color: #854d0e; line-height: 1.5;">
                        &#9888;&#65039; This link expires in 1 hour. If you didn't request a password reset, please ignore this email &mdash; your password will remain unchanged. If you're concerned about unauthorized access, contact us at <a href="mailto:support@w-timer.com" style="color: #6366f1; text-decoration: none;">support@w-timer.com</a>.
                      </p>
                    </td>
                  </tr>
                </table>

                <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;">

                <p style="margin: 0 0 8px; font-size: 13px; color: #78716c; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin: 0 0 8px; font-size: 12px; color: #6366f1; line-height: 1.5; word-break: break-all;">{{ .ConfirmationURL }}</p>

              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #a8a29e;">
                <a href="{{ .SiteURL }}" style="color: #78716c; text-decoration: none;">w-timer.com</a>
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #a8a29e;">
                Questions? Contact us at
                <a href="mailto:support@w-timer.com" style="color: #6366f1; text-decoration: none;">support@w-timer.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #d6d3d1;">
                &copy; 2026 Work Timer. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Change Email Address

**Subject:**

```
Confirm your new email address
```

**Body (HTML):**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Confirm email change</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f4; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f5f5f4;">Confirm your new email address for Work Timer</div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="{{ .SiteURL }}" style="text-decoration: none;">
                <img src="https://w-timer.com/logos/WT_logoWithText.png" alt="Work Timer" width="160" style="display: block; width: 160px; height: auto;">
              </a>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e7e5e4; overflow: hidden;">
              <div style="height: 4px; background: linear-gradient(90deg, #6366f1, #818cf8);"></div>
              <div style="padding: 40px 36px;">

                <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #1c1917; line-height: 1.3;">Confirm your new email</h1>

                <p style="margin: 0 0 16px; font-size: 15px; color: #44403c; line-height: 1.6;">You requested to change the email address associated with your Work Timer account. Please confirm this change by clicking the button below:</p>

                <!-- Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                  <tr>
                    <td align="center">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ .ConfirmationURL }}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" fillcolor="#6366f1">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;">Confirm Email Change</center>
                      </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-->
                      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; text-align: center; mso-hide: all;">
                        Confirm Email Change
                      </a>
                      <!--<![endif]-->
                    </td>
                  </tr>
                </table>

                <!-- Security notice -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 16px;">
                  <tr>
                    <td style="background-color: #fefce8; border-radius: 8px; padding: 16px; border: 1px solid #fef08a;">
                      <p style="margin: 0; font-size: 13px; color: #854d0e; line-height: 1.5;">
                        &#9888;&#65039; If you didn't request this change, please ignore this email. Your current email address will remain unchanged. If you're concerned about unauthorized access, contact us at <a href="mailto:support@w-timer.com" style="color: #6366f1; text-decoration: none;">support@w-timer.com</a>.
                      </p>
                    </td>
                  </tr>
                </table>

                <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;">

                <p style="margin: 0 0 8px; font-size: 13px; color: #78716c; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin: 0 0 8px; font-size: 12px; color: #6366f1; line-height: 1.5; word-break: break-all;">{{ .ConfirmationURL }}</p>

              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #a8a29e;">
                <a href="{{ .SiteURL }}" style="color: #78716c; text-decoration: none;">w-timer.com</a>
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #a8a29e;">
                Questions? Contact us at
                <a href="mailto:support@w-timer.com" style="color: #6366f1; text-decoration: none;">support@w-timer.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #d6d3d1;">
                &copy; 2026 Work Timer. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 5. Invite User (optional - if using Supabase invitations)

**Subject:**

```
You've been invited to Work Timer
```

**Body (HTML):**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>You're invited</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f4; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f5f5f4;">You've been invited to join Work Timer</div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="{{ .SiteURL }}" style="text-decoration: none;">
                <img src="https://w-timer.com/logos/WT_logoWithText.png" alt="Work Timer" width="160" style="display: block; width: 160px; height: auto;">
              </a>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e7e5e4; overflow: hidden;">
              <div style="height: 4px; background: linear-gradient(90deg, #6366f1, #818cf8);"></div>
              <div style="padding: 40px 36px;">

                <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #1c1917; line-height: 1.3;">You're invited to Work Timer</h1>

                <p style="margin: 0 0 16px; font-size: 15px; color: #44403c; line-height: 1.6;">Someone has invited you to join Work Timer &mdash; a simple, privacy-first time tracking tool. Click the button below to accept the invitation and create your account:</p>

                <!-- Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                  <tr>
                    <td align="center">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ .ConfirmationURL }}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" fillcolor="#6366f1">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;">Accept Invitation</center>
                      </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-->
                      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; text-align: center; mso-hide: all;">
                        Accept Invitation
                      </a>
                      <!--<![endif]-->
                    </td>
                  </tr>
                </table>

                <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;">

                <p style="margin: 0 0 8px; font-size: 13px; color: #78716c; line-height: 1.5;">If you weren't expecting this invitation, you can safely ignore this email.</p>

                <p style="margin: 0 0 8px; font-size: 13px; color: #78716c; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin: 0 0 8px; font-size: 12px; color: #6366f1; line-height: 1.5; word-break: break-all;">{{ .ConfirmationURL }}</p>

              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #a8a29e;">
                <a href="{{ .SiteURL }}" style="color: #78716c; text-decoration: none;">w-timer.com</a>
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #a8a29e;">
                Questions? Contact us at
                <a href="mailto:support@w-timer.com" style="color: #6366f1; text-decoration: none;">support@w-timer.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #d6d3d1;">
                &copy; 2026 Work Timer. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## How to Apply

In **Supabase Dashboard > Authentication > Email Templates**:

1. Click each template tab (Confirm signup, Magic Link, Reset Password, Change Email, Invite User)
2. Replace the **Subject** with the one above
3. Replace the **Body** with the HTML above
4. Click **Save**

All templates use the Supabase variable `{{ .ConfirmationURL }}` which is automatically replaced with the correct action URL. The `{{ .SiteURL }}` variable is replaced with your configured Site URL.
