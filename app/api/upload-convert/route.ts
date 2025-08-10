// Import necessary libraries
import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
// Import our internal Fountain parser
const { parse } = require('../../../lib/fountain-parser.js');

// This line prevents Vercel from trying to pre-render this route at build time
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. GET THE UPLOADED FILE
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new NextResponse('No file uploaded.', { status: 400 });
    }

    // 2. EXTRACT TEXT BASED ON FILE TYPE
    const buffer = Buffer.from(await file.arrayBuffer());
    let rawText = '';

    if (file.type === 'application/pdf') {
      // pdf-parse must be required dynamically to avoid build errors
      const pdf = require('pdf-parse');
      const data = await pdf(buffer);
      rawText = data.text;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const { value } = await mammoth.extractRawText({ buffer });
      rawText = value;
    } else {
      rawText = buffer.toString('utf8');
    }

    if (!rawText) {
        return new NextResponse('Could not extract text from file.', { status: 400 });
    }

    // 3. PARSE THE TEXT WITH OUR INTERNAL ENGINE
    const output = parse(rawText);
    const { title_page, script } = output.html;
    const fullHtml = title_page + script;

    // 4. GENERATE THE PDF USING PUPPETEER
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });

    const page = await browser.newPage();

    // Create the HTML content for our PDF with professional screenplay styling
    const content = `
      <html>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
          <style>
            /* US Letter page size: 8.5in x 11in */
            @page {
              size: 8.5in 11in;
              margin: 1in;
            }
            body {
              font-family: 'Courier Prime', Courier, monospace;
              font-size: 12pt;
              line-height: 1;
            }
            h1 { text-align: center; margin-top: 2in; margin-bottom: 0.5in; }
            p { margin: 0; padding: 0; }
            .credit, .authors, .date, .contact, .notes { text-align: center; margin: 0; }
            .authors { margin-top: 1em; }
            
            .scene-heading {
              text-transform: uppercase;
              margin-top: 1.5em;
              margin-bottom: 1em;
            }
            .action {
              margin-top: 1em;
              margin-bottom: 1em;
            }
            .character {
              margin-left: 2.2in; /* 3.7in from left edge of page */
              margin-top: 1em;
              text-transform: uppercase;
            }
            .dialogue {
              margin-left: 1.5in; /* 2.5in from left edge of page */
              margin-right: 1.5in; /* 7.0in from left edge of page */
            }
            .parenthetical {
              margin-left: 2.1in; /* 3.1in from left edge of page */
            }
            .transition {
              text-align: right;
              margin-top: 1.5em;
              margin-bottom: 1.5em;
            }
            .centered {
              text-align: center;
              margin-top: 1em;
              margin-bottom: 1em;
            }
            .dual-dialogue-character {
                float: left;
                width: 45%;
                margin-left: 0;
                text-align: center;
            }
            .dual-dialogue {
                float: left;
                width: 45%;
                margin-left: 0;
                text-align: left;
            }
            hr {
                visibility: hidden;
                page-break-after: always;
            }
          </style>
        </head>
        <body>
          ${fullHtml}
        </body>
      </html>
    `;

    await page.setContent(content, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ 
        format: 'letter',
        printBackground: true,
        margin: {
            top: '1in',
            right: '1in',
            bottom: '1in',
            left: '1.5in'
        }
    });

    await browser.close();

    // 5. SEND THE PDF BACK TO THE USER
    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^/.]+$/, "")}_converted.pdf"`,
      },
    });

  } catch (error) {
    console.error('Conversion Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new NextResponse(`Error converting file: ${errorMessage}`, { status: 500 });
  }
}
