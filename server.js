/**
 * Covenant Mercy Nigeria — Newsletter Generator
 * Standalone Express server with REST API
 *
 * Routes:
 *   GET  /              → Serves the web UI
 *   POST /api/generate  → Accepts JSON, returns .docx file
 *   GET  /api/health    → Health check
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  LevelFormat, BorderStyle, ShadingType, Header, Footer,
} = require('docx');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Health check ───────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'covenant-mercy-newsletter', version: '1.0.0' });
});

// ── Newsletter generation ──────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const {
    month, title, hook,
    personName, location,
    struggle, turningPoint, transformation,
    quote, quoteAttrib, forwardHope,
    mission1, mission2, mission3,
    insideWork,
    prayer1, prayer2, prayer3, prayer4,
    lookingAhead, closingGratitude,
  } = req.body;

  // ── Validation ───────────────────────────────────────────────
  const required = {
    month, title, hook, personName, location,
    struggle, turningPoint, transformation,
    quote, quoteAttrib, forwardHope,
    mission1, mission2, mission3,
    insideWork, prayer1, prayer2, prayer3,
    lookingAhead, closingGratitude,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v || !v.toString().trim())
    .map(([k]) => k);

  if (missing.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      fields: missing,
    });
  }

  try {
    const buffer = await buildNewsletterDocx(req.body);
    const safe   = month.replace(/\s+/g, '-').toLowerCase();

    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition',
      `attachment; filename="newsletter-${safe}.docx"`);
    res.send(buffer);
  } catch (err) {
    console.error('DOCX generation error:', err);
    res.status(500).json({ error: 'Failed to generate newsletter', detail: err.message });
  }
});

// ── DOCX builder ───────────────────────────────────────────────
async function buildNewsletterDocx(data) {
  const {
    month, title, hook,
    personName,
    struggle, turningPoint, transformation,
    quote, quoteAttrib, forwardHope,
    mission1, mission2, mission3,
    insideWork,
    prayer1, prayer2, prayer3, prayer4,
    lookingAhead, closingGratitude,
  } = data;

  // Design tokens
  const C = {
    deepBlue:  '1B3A6B',
    gold:      'C8922A',
    lightGold: 'FDF6E3',
    midBlue:   '2C5F9E',
    lightGrey: 'F5F5F5',
    textDark:  '222222',
    white:     'FFFFFF',
    mutedGrey: '888888',
  };

  // Org constants — update these if the organisation details ever change
  const ORG = {
    name:    'Carry Them Ministries',
    tagline: 'We carry them because no one else will. We carry them with love.',
    website: 'carrythem.org',
    email:   'Calebcarrythem.org',
    signoff: 'Mandy Crotts and the Carry Them Ministries Team',
  };

  // ── Element helpers ──────────────────────────────────────────
  const spacer = () => new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: '', size: 4 })],
  });

  const rule = (color = C.gold, size = 12) => new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size, color, space: 1 } },
    spacing: { before: 0, after: 160 },
    children: [],
  });

  const sectionHeading = label => new Paragraph({
    spacing:  { before: 320, after: 100 },
    shading:  { fill: C.deepBlue, type: ShadingType.CLEAR },
    indent:   { left: 180, right: 180 },
    children: [new TextRun({
      text: label.toUpperCase(), bold: true, font: 'Arial', size: 18, color: C.white,
    })],
  });

  const body = (text, opts = {}) => new Paragraph({
    spacing:   { before: 80, after: 120 },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    children:  [new TextRun({
      text,
      font:    'Georgia',
      size:    22,
      color:   opts.color || C.textDark,
      italics: !!opts.italic,
      bold:    !!opts.bold,
    })],
  });

  const subHeading = label => new Paragraph({
    spacing:  { before: 160, after: 40 },
    children: [new TextRun({ text: label, bold: true, font: 'Arial', size: 22, color: C.gold })],
  });

  const bullet = text => new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing:   { before: 60, after: 60 },
    children:  [new TextRun({ text, font: 'Georgia', size: 22, color: C.textDark })],
  });

  const pullQuote = (text, attrib) => [
    new Paragraph({
      indent:   { left: 720, right: 720 },
      spacing:  { before: 160, after: 60 },
      border:   { left: { style: BorderStyle.SINGLE, size: 20, color: C.gold, space: 10 } },
      children: [new TextRun({
        text: `"${text}"`, font: 'Georgia', size: 24, italics: true, color: C.midBlue, bold: true,
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing:   { before: 0, after: 120 },
      children:  [new TextRun({
        text: `— ${attrib}`, font: 'Georgia', size: 20, italics: true, color: C.mutedGrey,
      })],
    }),
  ];

  const fieldBox = text => new Paragraph({
    spacing:  { before: 80, after: 120 },
    shading:  { fill: C.lightGold, type: ShadingType.CLEAR },
    indent:   { left: 280, right: 280 },
    children: [new TextRun({ text, font: 'Georgia', size: 22, color: C.textDark, italics: true })],
  });

  // ── Build document ───────────────────────────────────────────
  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level:     0,
          format:    LevelFormat.BULLET,
          text:      '•',
          alignment: AlignmentType.LEFT,
          style:     { paragraph: { indent: { left: 540, hanging: 360 } } },
        }],
      }],
    },
    styles: {
      default: { document: { run: { font: 'Arial', size: 22, color: C.textDark } } },
    },
    sections: [{
      properties: {
        page: {
          size:   { width: 12240, height: 15840 },
          margin: { top: 720, right: 1080, bottom: 1080, left: 1080 },
        },
      },

      headers: {
        default: new Header({
          children: [new Paragraph({
            shading:   { fill: C.deepBlue, type: ShadingType.CLEAR },
            alignment: AlignmentType.CENTER,
            spacing:   { before: 120, after: 120 },
            children:  [
              new TextRun({ text: ORG.name,    bold: true, font: 'Arial', size: 28, color: C.white }),
              new TextRun({ text: '   |   ',                font: 'Arial', size: 28, color: C.gold }),
              new TextRun({ text: ORG.tagline,             font: 'Arial', size: 22, color: 'D4E6FF', italics: true }),
            ],
          })],
        }),
      },

      footers: {
        default: new Footer({
          children: [
            rule(C.gold, 6),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing:   { before: 60, after: 60 },
              children:  [new TextRun({
                text:  `${ORG.website}  •  ${ORG.email}  •  ${month}`,
                font:  'Arial',
                size:  16,
                color: C.mutedGrey,
              })],
            }),
          ],
        }),
      },

      children: [
        spacer(),

        // ── Title ──────────────────────────────────────────────
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing:   { before: 200, after: 60 },
          children:  [new TextRun({ text: title, bold: true, font: 'Georgia', size: 52, color: C.deepBlue })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing:   { before: 0, after: 60 },
          children:  [new TextRun({ text: `${month} Newsletter`, font: 'Arial', size: 22, color: C.gold, bold: true })],
        }),
        rule(C.gold, 16),

        // ── Opening Hook ───────────────────────────────────────
        sectionHeading('A Message This Month'),
        spacer(),
        new Paragraph({
          spacing:  { before: 80, after: 160 },
          children: [new TextRun({ text: hook, font: 'Georgia', size: 24, color: C.textDark, italics: true })],
        }),
        rule(C.lightGrey, 6),
        spacer(),

        // ── Story ──────────────────────────────────────────────
        sectionHeading(`Story of the Month — ${personName}'s Journey`),
        spacer(),
        subHeading('The Struggle'),
        body(struggle),
        spacer(),
        subHeading('The Turning Point'),
        body(turningPoint),
        spacer(),
        subHeading('The Transformation'),
        body(transformation),
        spacer(),
        ...pullQuote(quote, quoteAttrib),
        subHeading('Forward Hope'),
        body(forwardHope),
        rule(C.lightGrey, 6),
        spacer(),

        // ── Mission ────────────────────────────────────────────
        sectionHeading('Mission in Motion'),
        spacer(),
        body('Here is what your partnership made possible in the last 30 days:'),
        spacer(),
        ...[mission1, mission2, mission3].map(bullet),
        rule(C.lightGrey, 6),
        spacer(),

        // ── Inside the Work ────────────────────────────────────
        sectionHeading('Inside the Work'),
        spacer(),
        fieldBox(insideWork),
        rule(C.lightGrey, 6),
        spacer(),

        // ── Prayer Points ──────────────────────────────────────
        sectionHeading('Prayer Points'),
        spacer(),
        body('Will you take a moment to pray with us?', { italic: true }),
        spacer(),
        ...[prayer1, prayer2, prayer3, ...(prayer4 ? [prayer4] : [])].map(bullet),
        rule(C.lightGrey, 6),
        spacer(),

        // ── Looking Ahead ──────────────────────────────────────
        sectionHeading('Looking Ahead'),
        spacer(),
        body(lookingAhead),
        rule(C.lightGrey, 6),
        spacer(),

        // ── Thank You ──────────────────────────────────────────
        sectionHeading('Thank You'),
        spacer(),
        body(closingGratitude),
        spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing:   { before: 80, after: 40 },
          children:  [new TextRun({
            text: 'With deep gratitude,', font: 'Georgia', size: 22, italics: true, color: C.mutedGrey,
          })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing:   { before: 0, after: 80 },
          children:  [new TextRun({
            text: ORG.signoff, font: 'Georgia', size: 22, bold: true, color: C.deepBlue,
          })],
        }),
        spacer(),
        rule(C.gold, 12),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing:   { before: 80, after: 80 },
          children:  [
            new TextRun({ text: 'To give, pray, or share this newsletter: ', font: 'Arial', size: 20, color: C.mutedGrey }),
            new TextRun({ text: ORG.website, font: 'Arial', size: 20, color: C.midBlue, bold: true }),
          ],
        }),
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}

// ── Start server ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   Covenant Mercy Nigeria — Newsletter API     ║
╠═══════════════════════════════════════════════╣
║  Web UI  →  http://localhost:${PORT}             ║
║  API     →  POST /api/generate                ║
║  Health  →  GET  /api/health                  ║
╚═══════════════════════════════════════════════╝
`);
});
