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
          <link href="https://fonts.googleapis.com/css2?family=Courier+Prime&display=swap" rel="stylesheet">
          <style>
            @page {
              size: 8.5in 11in;
              margin: 0; /* We'll control margins with padding */
            }
            body {
              font-family: 'Courier Prime', Courier, monospace;
              font-size: 12pt;
              line-height: 1;
              margin: 0;
              padding: 1in 1in 1in 1.5in; /* Top, Right, Bottom, Left */
              box-sizing: border-box;
              width: 8.5in;
              height: 11in;
            }
            .page-container {
                position: relative;
                height: 9in; /* 11in - 1in top margin - 1in bottom margin */
            }
            .page-number {
                position: absolute;
                top: -0.5in;
                right: 0;
                font-size: 12pt;
            }
            .title-page {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 9in;
                text-align: center;
            }
            .title-page .title { font-size: 24pt; margin-bottom: 1em; }
            .title-page .credit { margin-top: 2em; }
            .title-page .authors { margin-top: 0.5em; }
            .title-page .date { position: absolute; bottom: 2in; }
            .title-page .contact { position: absolute; bottom: 1.5in; }
            .title-page .notes { position: absolute; bottom: 1in; }

            .scene-heading {
              text-transform: uppercase;
              margin-top: 1.5em;
              margin-bottom: 1em;
              position: relative;
            }
            .scene-number-left {
                position: absolute;
                left: -0.5in;
            }
            .scene-number-right {
                position: absolute;
                right: 0;
            }
            .action {
              margin-top: 1em;
              margin-bottom: 1em;
            }
            .character {
              margin-left: 2.2in;
              margin-top: 1em;
              text-transform: uppercase;
            }
            .dialogue {
              margin-left: 1.0in;
              margin-right: 1.5in;
            }
            .parenthetical {
              margin-left: 1.6in;
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
            hr {
                visibility: hidden;
                page-break-after: always;
            }
          </style>
        </head>
        <body>
          <div class="title-page">${title_page}</div>
          <hr> <!-- Force page break after title page -->
          <div class="page-container">
            <div class="page-number"></div> <!-- Placeholder for JS to fill -->
            ${script}
          </div>
        </body>
      </html>
    `;

    await page.setContent(content, { waitUntil: 'networkidle0' });
    
    // Use JavaScript to add page numbers
    await page.evaluate(() => {
        const pages = document.querySelectorAll('.page-container');
        for (let i = 0; i < pages.length; i++) {
            const pageNumDiv = pages[i].querySelector('.page-number');
            if (pageNumDiv) {
                pageNumDiv.innerHTML = `${i + 2}.`;
            }
        }
    });

    const pdfBuffer = await page.pdf({ 
        format: 'letter',
        printBackground: true,
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
