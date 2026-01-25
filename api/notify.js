// Vercel Serverless Function (Node.js)
// Handles Email, SMS, and WhatsApp sending securely.

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { channel, to, subject, html, message } = req.body || {};

    // Environment Variables (Add these in Vercel Settings)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER; // whatsapp:+14155238886
    const SMS_KEY = process.env.FAST2SMS_API_KEY;

    try {
        let result = { success: false, provider: 'Unknown' };

        // 1. EMAIL via RESEND
        if (channel === 'email') {
            if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'Snackzo <orders@snackzo.tech>',
                    to: [to],
                    subject: subject,
                    html: html
                })
            });
            result = await response.json();
            result.provider = 'Resend';
        }

        // 2. WHATSAPP via TWILIO
        else if (channel === 'whatsapp') {
            if (!TWILIO_SID) throw new Error('Missing TWILIO Keys');

            // Twilio requires Form URL Encoded
            const params = new URLSearchParams();
            params.append('To', to.startsWith('whatsapp:') ? to : `whatsapp:${to}`);
            params.append('From', TWILIO_PHONE || 'whatsapp:+14155238886');
            params.append('Body', message);

            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });
            result = await response.json();
            result.provider = 'Twilio';
        }

        // 3. SMS via FAST2SMS
        else if (channel === 'sms') {
            if (!SMS_KEY) throw new Error('Missing FAST2SMS_API_KEY');

            const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
                method: "POST",
                headers: {
                    "authorization": SMS_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "route": "v3",
                    "sender_id": "TXTIND",
                    "message": message,
                    "language": "english",
                    "flash": 0,
                    "numbers": to
                })
            });
            result = await response.json();
            result.provider = 'Fast2SMS';
        }

        res.status(200).json(result);

    } catch (error) {
        console.error('Notification Error:', error);
        res.status(500).json({ error: error.message });
    }
}
