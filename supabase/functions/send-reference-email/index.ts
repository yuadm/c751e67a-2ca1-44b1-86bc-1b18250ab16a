import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReferenceEmailRequest {
  applicationId: string;
  applicantName: string;
  applicantAddress: string;
  applicantPostcode: string;
  positionAppliedFor?: string;
  referenceEmail: string;
  referenceName: string;
  referenceCompany?: string;
  referenceAddress?: string;
  companyName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      applicationId,
      applicantName,
      applicantAddress,
      applicantPostcode,
      positionAppliedFor,
      referenceEmail,
      referenceName,
      referenceCompany,
      referenceAddress,
      companyName,
    }: ReferenceEmailRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create reference request in database
    const referenceToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days from now

    const { data: referenceRequest, error: dbError } = await supabase
      .from('reference_requests')
      .insert({
        application_id: applicationId,
        reference_email: referenceEmail,
        reference_name: referenceName,
        applicant_name: applicantName,
        applicant_address: applicantAddress,
        applicant_postcode: applicantPostcode,
        position_applied_for: positionAppliedFor,
        company_name: companyName,
        token: referenceToken,
        expires_at: expiresAt.toISOString(),
        status: 'sent'
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to create reference request: ${dbError.message}`);
    }

    // Derive site origin from request for building public URL
    const siteOrigin = req.headers.get("origin") || `${new URL(req.url).protocol}//${new URL(req.url).host}`;
    const safeCompanyName = companyName && companyName.trim().length > 0 ? companyName : 'Your Company Name';
    const roleTitle = positionAppliedFor && positionAppliedFor.trim().length > 0 ? positionAppliedFor : 'Support Worker/Carer';
    const referenceLink = `${siteOrigin}/reference?token=${referenceToken}`;

    console.log("Sending reference email to:", referenceEmail, "for applicant:", applicantName);

    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reference Request for ${applicantName}</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:0}
      .container{max-width:640px;margin:0 auto;background:#fff}
      .content{padding:32px}
      .btn{display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;margin:16px 0}
      .footer{background:#f3f4f6;padding:20px;text-align:center;color:#6b7280;font-size:12px}
    </style>
  </head>
  <body>
    <div class="container">
      <div class="content">
        <p style="margin:0 0 16px 0;">Dear ${referenceName},</p>
        <p style="margin:0 0 16px 0;">I hope this message finds you well.</p>
        <p style="margin:0 0 16px 0;">
          I am reaching out to request a professional reference for ${applicantName}, who has applied for the position of ${roleTitle} at ${safeCompanyName}. ${applicantName.split(' ')[0] || applicantName} listed you as a reference, and we would greatly appreciate your feedback regarding ${applicantName.split(' ')[0] || applicantName}'s qualifications, work ethic, and overall suitability for the role.
        </p>
        <p style="margin:0 0 16px 0;">To provide your reference, please click the link below and complete the short form:</p>
        <p style="margin:0 0 16px 0; text-align:center;">
          👉 <a href="${referenceLink}" class="btn">Provide Reference</a>
        </p>
        <p style="margin:0 0 16px 0;">
          Your input will play a valuable role in our hiring process, and we sincerely thank you for your time and assistance. If you have any questions or would prefer to speak directly, please feel free to contact me.
        </p>
        <p style="margin:24px 0 0 0;">
          Best regards,<br/>
          Yusuf<br/>
          HR<br/>
          ${safeCompanyName}
        </p>
      </div>
      <div class="footer">
        <p style="margin:0;">This link is unique to you and will expire in 14 days. Please do not share it.</p>
      </div>
    </div>
  </body>
</html>
`;


    const apiKey = Deno.env.get("BREVO_API_KEY");
    if (!apiKey) {
      throw new Error("BREVO_API_KEY environment variable is not set");
    }

    const payload = {
      sender: { name: "Document Signing System", email: "yuadm3@gmail.com" },
      replyTo: { name: "Document Signing System", email: "yuadm3@gmail.com" },
      to: [{ email: referenceEmail, name: referenceName }],
      subject: `Reference Request – ${applicantName}`,
      htmlContent: emailHtml,
    };

    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Brevo API error response:", errorText);
      throw new Error(`Brevo API error: ${emailResponse.status} - ${errorText}`);
    }

    const result = await emailResponse.json();

    console.log("Reference email sent successfully:", result);

    return new Response(JSON.stringify({ 
      success: true,
      provider: "brevo",
      messageId: result?.messageId ?? null,
      referenceLink,
      referenceToken
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-reference-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);