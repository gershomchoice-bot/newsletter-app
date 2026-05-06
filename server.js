/**
 * Carry Them Ministries — Newsletter Generator v3
 * Outputs a professional PDF matching the Canva editorial template
 *
 * Routes:
 *   GET  /              → Web UI
 *   POST /api/generate  → JSON body → .pdf file
 *   GET  /api/health    → Health check
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const os       = require('os');
const crypto   = require('crypto');
const { spawnSync } = require('child_process');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '40mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Constants ───────────────────────────────────────────────
const ORG = {
  name:         'Carry Them Ministries',
  website:      'www.carrythem.org',
  websiteUrl:   'https://www.carrythem.org',
  donationUrl:  'https://www.carrythem.org/?fbclid=PARlRTSARohxFleHRuA2FlbQIxMABzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAadUE4tbWJxu-T-zPLbDFyr3fkGCyrtquTlLRJOti3_Bda5yLmdbnK-wNpjtJA_aem_3h8N8Ei8B8siqdsbFvcIWw',
  igUrl:        'https://www.instagram.com/carrythemministries?igsh=MXhmY292djRrbjI3eA==',
  fbUrl:        'https://www.facebook.com/share/g/17aRxTko6i/',
  signoff:      'Mandolyn Crotts',
  signerTitle:  'Director of Programs, Carry Them Ministries',
};

// Read and prepare the SVG logo (inline-safe with unique IDs)
const LOGO_SVG = (() => {
  try {
    let svg = fs.readFileSync(path.join(__dirname, 'assets', 'logo.svg'), 'utf8');
    // Make clip-path IDs unique so multiple SVGs on a page don't conflict
    svg = svg.replace(/id="cc"/g, 'id="ctm-cc"')
             .replace(/url\(#cc\)/g, 'url(#ctm-cc)');
    // Strip xml declaration if present
    svg = svg.replace(/<\?xml[^>]*\?>/g, '').trim();
    return svg;
  } catch (e) {
    return '<svg viewBox="0 0 820 160"><text x="10" y="80" font-size="40" fill="white">CTM</text></svg>';
  }
})();

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'carry-them-newsletter', version: '3.0.0' });
});

// ── PDF generation endpoint ─────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const { content, images } = req.body;

  if (!content || !images) {
    return res.status(400).json({ error: 'Missing content or images in request body' });
  }

  const required = [
    'month','title','hook','personName','location',
    'struggle','turningPoint','transformation',
    'quote','quoteAttrib','forwardHope',
    'mission1','mission2','mission3',
    'specialLead','specialBody',
    'prayer1','prayer2','prayer3',
    'lookingAhead','closingGratitude',
  ];
  const missing = required.filter(k => !content[k]?.toString().trim());
  if (missing.length) {
    return res.status(400).json({ error: 'Missing required fields', fields: missing });
  }

  const imgRequired = ['cover','story','mission','prayer1','prayer2','prayer3','support','headshot'];
  const missingImgs = imgRequired.filter(k => !images[k]);
  if (missingImgs.length) {
    return res.status(400).json({ error: 'Missing required images', fields: missingImgs });
  }

  // Write HTML to temp file, generate PDF, stream back
  const uid      = crypto.randomBytes(8).toString('hex');
  const htmlPath = path.join(os.tmpdir(), `newsletter-${uid}.html`);
  const pdfPath  = path.join(os.tmpdir(), `newsletter-${uid}.pdf`);

  try {
    const html = buildNewsletterHTML(content, images);
    fs.writeFileSync(htmlPath, html, 'utf8');

    const result = spawnSync('wkhtmltopdf', [
      '--quiet',
      '--page-size',        'A4',
      '--margin-top',       '0',
      '--margin-right',     '0',
      '--margin-bottom',    '0',
      '--margin-left',      '0',
      '--enable-local-file-access',
      '--zoom',             '1',
      '--dpi',              '150',
      '--image-quality',    '94',
      '--print-media-type',
      htmlPath, pdfPath,
    ], { timeout: 60000 });

    if (result.status !== 0) {
      const errMsg = result.stderr?.toString() || 'Unknown error';
      throw new Error(`wkhtmltopdf failed: ${errMsg}`);
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    const safe      = content.month.replace(/\s+/g, '-').toLowerCase();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="newsletter-${safe}.pdf"`);
    res.send(pdfBuffer);
  } finally {
    try { fs.unlinkSync(htmlPath); } catch (_) {}
    try { fs.unlinkSync(pdfPath);  } catch (_) {}
  }
});

// ── HTML Template ───────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


function buildNewsletterHTML(c, imgs) {
  const prayerItems = [c.prayer1, c.prayer2, c.prayer3, c.prayer4]
    .filter(Boolean)
    .map(p => {
      const match = p.match(/^(Pray for [^—–\-]+[—–\-]?\s*)(.*)/i);
      if (match) {
        return `<li><strong>${esc(match[1].trim())}</strong>${match[2] ? ' ' + esc(match[2]) : ''}</li>`;
      }
      return `<li>${esc(p)}</li>`;
    }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
@page{size:A4;margin:0}
body{width:100%;max-width:794px;margin:0 auto;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#272727;-webkit-print-color-adjust:exact;print-color-adjust:exact}

/* Cover */
.cover{position:relative;width:100%;height:440px;overflow:hidden}
.cover-img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;filter:brightness(0.62)}
.cover-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 40px}
.cover-logo{position:absolute;top:22px;left:50%;transform:translateX(-50%);width:188px}
.cover-logo svg{width:188px;height:auto}
.cover-title{color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:46px;font-weight:700;letter-spacing:.13em;text-align:center;text-transform:uppercase;line-height:1.1;margin-top:64px;text-shadow:0 2px 10px rgba(0,0,0,0.45)}
.cover-date{color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:.22em;text-align:center;text-transform:uppercase;margin-top:18px;line-height:1.9;opacity:.9}

/* Hook */
.hook{font-family:Georgia,'Times New Roman',serif;font-size:18px;font-style:italic;text-align:center;color:#272727;padding:36px 52px 28px;line-height:1.58}

/* Section label */
.label{color:#027702;font-family:Arial,Helvetica,sans-serif;font-size:8.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:18px 24px 8px 56px}

/* Body text */
.body{font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.56;color:#272727;padding:0 24px 18px 56px}

/* Full-width story image */
.full-img{width:100%;display:block;max-height:310px;object-fit:cover;object-position:center}

/* Pull quote */
.pull-quote{font-family:Georgia,'Times New Roman',serif;font-size:16.5px;font-style:italic;text-align:center;color:#272727;padding:28px 60px 10px;line-height:1.52}
.attribution{font-family:Georgia,'Times New Roman',serif;font-size:12.5px;font-style:italic;text-align:center;color:#555555;padding:0 60px 24px}

/* Two-column panel */
.two-col{display:flex;width:100%;min-height:230px}
.col-photo{flex:0 0 50%;overflow:hidden}
.col-photo img{width:100%;height:100%;object-fit:cover;display:block}
.col-photo.stacked{display:flex;flex-direction:column}
.col-photo.stacked img{flex:1;display:block}
.col-tan{flex:1;background:#DDD3BA;padding:28px 22px 28px 26px;display:flex;flex-direction:column;justify-content:center}
.col-tan h3{font-family:Georgia,'Times New Roman',serif;font-size:17.5px;font-weight:400;color:#1a1a1a;margin-bottom:8px;line-height:1.3}
.col-tan .sub{font-family:Arial,sans-serif;font-size:10.5px;font-weight:700;color:#1a1a1a;margin-bottom:13px;line-height:1.4}
.col-tan ul{list-style:none;padding:0;margin:0}
.col-tan li{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:4px 0 4px 14px;position:relative;line-height:1.46}
.col-tan li::before{content:'·';position:absolute;left:0;font-weight:700}
.col-tan li strong{font-weight:700}

/* Special Moment */
.special-lead{font-family:Georgia,'Times New Roman',serif;font-size:18px;font-style:italic;color:#272727;padding:4px 24px 12px 56px;line-height:1.46}

/* Thank You */
.thank-you{font-family:Georgia,'Times New Roman',serif;font-size:19px;text-align:center;color:#272727;padding:26px 40px 18px;line-height:1.4}
.thank-you em{font-style:italic}

/* Signoff */
.signoff{text-align:center;padding:8px 24px 24px}
.headshot{width:58px;height:58px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 10px}
.gratitude{font-family:Arial,sans-serif;font-size:11.5px;font-style:italic;color:#272727;line-height:2.1}
.signer-name{font-family:Arial,sans-serif;font-size:11.5px;font-weight:700;color:#272727;line-height:2.1}
.signer-title{font-family:Arial,sans-serif;font-size:10px;font-style:italic;color:#272727;line-height:1.8}

/* Support panel */
.col-support{flex:1;background:#E8DFC8;padding:36px 26px;display:flex;flex-direction:column;justify-content:center}
.support-h{font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:400;color:#1a1a1a;line-height:1.25;margin-bottom:10px}
.support-p{font-family:Arial,sans-serif;font-size:11px;color:#272727;margin-bottom:18px;line-height:1.5}
.support-btn{display:inline-block;border:1.5px solid #1a1a1a;color:#1a1a1a;font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:9px 20px;text-decoration:none}

/* Footer */
.footer{text-align:center;padding:17px 24px 20px;border-top:1px solid #e0e0e0;background:#ffffff}
.footer p{font-family:Georgia,'Times New Roman',serif;color:#272727;margin:4px 0}

/* Spacers */
.sp{height:20px}
.sp-s{height:9px}
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <img src="${imgs.cover}" class="cover-img" alt="">
  <div class="cover-overlay">
    <div class="cover-logo">${LOGO_SVG}</div>
    <h1 class="cover-title">${esc(c.title)}</h1>
    <p class="cover-date">${esc(c.month).toUpperCase()}<br>NEWSLETTER</p>
  </div>
</div>

<!-- HOOK -->
<p class="hook">${esc(c.hook)}</p>

<!-- STRUGGLE -->
<p class="label">THE STRUGGLE</p>
<p class="body">${esc(c.struggle)}</p>
<div class="sp-s"></div>

<!-- TURNING POINT -->
<p class="label">THE TURNING POINT</p>
<p class="body">${esc(c.turningPoint)}</p>
<div class="sp"></div>

<!-- STORY IMAGE -->
<img src="${imgs.story}" class="full-img" alt="">
<div class="sp-s"></div>

<!-- TRANSFORMATION -->
<p class="label">THE TRANSFORMATION</p>
<p class="body">${esc(c.transformation)}</p>
<div class="sp-s"></div>

<!-- PULL QUOTE -->
<p class="pull-quote">&ldquo;${esc(c.quote)}&rdquo;</p>
<p class="attribution">&mdash; ${esc(c.quoteAttrib)}</p>
<div class="sp"></div>

<!-- FORWARD HOPE -->
<p class="label">FORWARD HOPE</p>
<p class="body">${esc(c.forwardHope)}</p>
<div class="sp"></div>

<!-- MISSION PANEL -->
<div class="two-col">
  <div class="col-photo"><img src="${imgs.mission}" alt=""></div>
  <div class="col-tan">
    <h3>Mission in Motion</h3>
    <p class="sub">Here is what your partnership made possible in the last 30 days:</p>
    <ul>
      <li>${esc(c.mission1)}</li>
      <li>${esc(c.mission2)}</li>
      <li>${esc(c.mission3)}</li>
    </ul>
  </div>
</div>
<div class="sp"></div>

<!-- SPECIAL MOMENT -->
<p class="label">SPECIAL MOMENT HIGHLIGHT</p>
<p class="special-lead">${esc(c.specialLead)}</p>
<p class="body">${esc(c.specialBody)}</p>
<div class="sp-s"></div>

<!-- LOOKING AHEAD -->
<p class="label">LOOKING AHEAD</p>
<p class="body">${esc(c.lookingAhead)}</p>
<div class="sp"></div>

<!-- PRAYER PANEL -->
<div class="two-col">
  <div class="col-photo stacked">
    <img src="${imgs.prayer1}" alt="">
    <img src="${imgs.prayer2}" alt="">
    <img src="${imgs.prayer3}" alt="">
  </div>
  <div class="col-tan">
    <h3>Will you take a moment to pray with us?</h3>
    <ul>${prayerItems}</ul>
  </div>
</div>
<div class="sp"></div>

<!-- CLOSING -->
<p class="label">LOOKING AHEAD</p>
<p class="body">${esc(c.closingGratitude)}</p>
<p class="thank-you">Thank you for making all this <em>possible</em>.</p>

<!-- SIGNOFF -->
<div class="signoff">
  <img src="${imgs.headshot}" class="headshot" alt="Mandolyn Crotts">
  <p class="gratitude">With deep gratitude,</p>
  <p class="signer-name">${esc(ORG.signoff)}</p>
  <p class="signer-title">${esc(ORG.signerTitle)}</p>
</div>
<div class="sp"></div>

<!-- SUPPORT PANEL -->
<div class="two-col">
  <div class="col-support">
    <h2 class="support-h">Feel led to<br>support us?</h2>
    <p class="support-p">Make a difference in the life of a child today by giving below.</p>
    <a href="${ORG.donationUrl}" class="support-btn">SUPPORT US</a>
  </div>
  <div class="col-photo"><img src="${imgs.support}" alt=""></div>
</div>

<!-- FOOTER -->
<div class="footer">
  <p style="font-size:10.5px">Follow Us</p>
  <p style="font-size:13px">
    <a href="${ORG.igUrl}" style="color:inherit;text-decoration:none">Instagram</a>
    &nbsp;&nbsp;&nbsp;
    <a href="${ORG.fbUrl}" style="color:inherit;text-decoration:none">Facebook</a>
  </p>
  <p style="font-size:13px;font-weight:700">
    <a href="${ORG.websiteUrl}" style="color:inherit;text-decoration:none">${esc(ORG.website)}</a>
  </p>
  <p style="font-size:9.5px;color:#737373;margin-top:6px">
    <a href="#" style="color:#737373;text-decoration:underline">View in Browser</a>
    &nbsp;&nbsp;
    <a href="#" style="color:#737373;text-decoration:underline">Update Preferences</a>
    &nbsp;&nbsp;
    <a href="#" style="color:#737373;text-decoration:underline">Unsubscribe</a>
  </p>
</div>

</body>
</html>`;
}

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   Carry Them Ministries — Newsletter API  v3  ║
╠═══════════════════════════════════════════════╣
║  Web UI  →  http://localhost:${PORT}             ║
║  PDF     →  POST /api/generate                ║
╚═══════════════════════════════════════════════╝
`);
});
