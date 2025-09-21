const express = require('express');
const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));

// Serve static files from the main directory
app.use(express.static(__dirname));

// Route for form submission
app.post('/send', async (req, res) => {
  const { from, to, message } = req.body;

  // Validate emails
  if (![from, to].every(email => /^[^@]+@[^@]+\.[^@]+$/.test(email))) {
    return res.status(400).send('Invalid email format.');
  }

  const domain = to.split('@')[1];

  async function getMX(domain) {
    try {
      const records = await dns.resolveMx(domain);
      records.sort((a, b) => a.priority - b.priority);
      return records[0].exchange;
    } catch (err) {
      console.error(`Failed to get MX record for ${domain}:`, err);
      return null;
    }
  }

  const mxHost = await getMX(domain);
  if (!mxHost) return res.status(500).send('Could not resolve recipient mail server.');

  const transporter = nodemailer.createTransport({
    host: mxHost,
    port: 25,
    secure: false,
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from,
    to,
    subject: 'Direct Email',
    text: message
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    res.send(`Email sent successfully: ${info.response}`);
  } catch (err) {
    console.error('Send failed:', err);
    res.status(500).send(`Failed to send email: ${err.message}`);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
