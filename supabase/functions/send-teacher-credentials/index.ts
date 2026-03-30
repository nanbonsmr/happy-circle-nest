import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY is not configured");
    }

    const { teacherName, teacherEmail, password } = await req.json();

    if (!teacherEmail || !password) {
      return new Response(JSON.stringify({ error: "teacherEmail and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #1a8fe3; padding: 24px 32px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px;">🎓 Welcome to Nejo Exam Prep</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #333;">Dear <strong>${teacherName || "Teacher"}</strong>,</p>
      <p style="font-size: 14px; color: #555;">Your teacher account has been created by the administrator. Here are your login credentials:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f0f7ff;">
          <td style="padding: 12px 16px; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Email</td>
          <td style="padding: 12px 16px; border: 1px solid #e5e7eb; font-weight: bold; color: #1a8fe3;">${teacherEmail}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Password</td>
          <td style="padding: 12px 16px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 16px; font-weight: bold; color: #1e3a5f; background: #f9fafb;">${password}</td>
        </tr>
      </table>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <p style="font-size: 13px; color: #92400e; margin: 0;"><strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.</p>
      </div>

      <p style="font-size: 14px; color: #555;">You can log in at the platform and start creating exams for your students.</p>
    </div>
    <div style="background: #f9fafb; padding: 16px 32px; text-align: center;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">Nejo Exam Prep — Online Examination Platform</p>
    </div>
  </div>
</body>
</html>`;

    const emailPayload = {
      sender: { name: "Nejo Exam Prep", email: "nanbonai5@gmail.com" },
      to: [{ email: teacherEmail, name: teacherName || "Teacher" }],
      subject: "Your Teacher Account Credentials — Nejo Exam Prep",
      htmlContent,
    };

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const responseBody = await response.text();
    console.log(`Brevo response: ${response.status} - ${responseBody}`);

    if (!response.ok) {
      throw new Error(`Brevo API error [${response.status}]: ${responseBody}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending teacher credentials:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
