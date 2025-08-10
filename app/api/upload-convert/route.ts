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
          <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
          <style>
            /* Reset and Page Setup */
            * { box-sizing: border-box; }
            
            @page {
              size: 8.5in 11in;
              margin: 1in 1in 1in 1.5in;
            }
            
            body {
              font-family: 'Courier Prime', 'Courier New', Courier, monospace;
              font-size: 12pt;
              line-height: 1.15;
            }

            p, div {
                margin-top: 0;
                margin-bottom: 1em; /* Standard line break */
            }
            
            /* Title Page Styling */
            .title-page-container {
              width: 100%;
              height: 9in; /* Full page height minus margins */
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              page-break-after: always;
            }
            
            .title-page-content {
                margin-top: -2in; /* Adjust to center vertically */
            }

            .title-page-container h1.title {
              font-size: 14pt;
              text-transform: uppercase;
              margin-bottom: 2em;
            }
            
            .title-page-container p {
              margin-bottom: 0.5em;
            }
            
            /* Scene Headings */
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
              right: -0.5in;
            }
            
            /* Action Lines */
            .action {
              margin-bottom: 1em;
            }
            
            /* Character Names */
            .character {
              text-transform: uppercase;
              margin-left: 2.2in;
              margin-bottom: 0;
            }
            
            /* Dialogue */
            .dialogue {
              margin-left: 1.0in;
              margin-right: 1.5in;
              margin-bottom: 1em;
            }
            
            /* Parentheticals */
            .parenthetical {
              margin-left: 1.6in;
              margin-right: 2.0in;
              margin-bottom: 0;
            }
            
            /* Transitions */
            .transition {
              text-transform: uppercase;
              text-align: right;
              margin-top: 1em;
              margin-bottom: 1em;
            }
            
            /* Centered Text */
            .centered {
              text-align: center;
              margin-top: 1em;
              margin-bottom: 1em;
            }
            
            /* Text Emphasis */
            b, i, u { display: inline; }
            
            /* Page break handling */
            hr { display: none; }
            
          </style>
        </head>
        <body>
          ${title_page ? `<div class="title-page-container"><div class="title-page-content">${title_page}</div></div>` : ''}
          <div class="script-content">
            ${script}
          </div>
        </body>
      </html>
    `;

    await page.setContent(content, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({ 
        format: 'letter',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size:10px; margin-left:1.5in; margin-right:1in;"></div>`, // Empty header
        footerTemplate: `<div style="font-size:10px; margin-left:1.5in; margin-right:1in;"></div>`, // Empty footer
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
