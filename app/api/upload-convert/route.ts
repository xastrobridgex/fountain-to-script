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
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: 8.5in 11in;
              /* Margins are now handled by the page.pdf() call */
            }
            
            /* Body - Main container */
            body {
              font-family: 'Courier Prime', 'Courier New', Courier, monospace;
              font-size: 12pt;
              line-height: 1;
            }
            
            /* The .page class is now only for the title page */
            .page {
              position: relative;
              width: 8.5in;
              height: 11in;
              padding: 1in 1in 1in 1.5in; /* Top, Right, Bottom, Left */
              page-break-after: always;
              page-break-inside: avoid;
            }
            
            .page:last-child {
              page-break-after: auto;
            }
            
            /* REMOVED .page-number since Puppeteer now handles it */
            
            /* Title Page Styling */
            .title-page {
              width: 8.5in;
              height: 11in;
              padding: 1in;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              page-break-after: always;
            }
            
            .title-page .title {
              font-size: 14pt;
              text-transform: uppercase;
              margin-bottom: 4em;
              font-weight: normal;
            }
            
            .title-page .credit {
              font-size: 12pt;
              margin-bottom: 1em;
            }
            
            .title-page .authors {
              font-size: 12pt;
              margin-bottom: 6em;
            }
            
            .title-page .notes,
            .title-page .date,
            .title-page .contact,
            .title-page .copyright {
              font-size: 12pt;
              position: absolute;
              text-align: left;
              left: 1.5in; /* Align to the main script left margin */
              right: auto;
            }

            /* This stacks the elements from the bottom of the page up */
            .title-page .contact {
              bottom: 1.5in;
            }
            .title-page .copyright {
              bottom: 1.75in;
            }
            .title-page .date {
              bottom: 2.0in;
            }
            .title-page .notes {
              bottom: 2.25in;
            }
            
            /* Script Content Container */
            .script-content {
              /* This container now holds all the script elements directly */
              width: 6in; /* 8.5in - 1.5in left - 1in right */
            }
            
            /* CORRECTED Scene Heading Layout */
            .scene-heading {
              font-weight: bold;
              text-transform: uppercase;
              margin-top: 2em;
              margin-bottom: 1em;
              position: relative; /* Establishes a container for the numbers */
              page-break-after: avoid;
              page-break-before: auto;
            }
            
            
            /* Action Lines */
            .action {
              margin-top: 1em;
              margin-bottom: 1em;
              width: 6in;
              page-break-inside: auto; /* Allow actions to break across pages */
            }
            
            /* Character Names */
            .character {
              text-transform: uppercase;
              margin-top: 1em;
              margin-bottom: 0;
              margin-left: 2.2in;
              page-break-after: avoid; /* Keeps character name with dialogue */
            }
            
            /* Dialogue */
            .dialogue {
              margin-top: 0;
              margin-bottom: 0;
              margin-left: 1in;
              margin-right: 1.5in;
              width: 3.5in;
              page-break-inside: auto; /* Allow dialogue to break across pages */
            }
            
            /* Parentheticals */
            .parenthetical {
              margin-top: 0;
              margin-bottom: 0;
              margin-left: 1.6in;
              margin-right: 2in;
              page-break-inside: avoid;
              page-break-after: avoid;
            }
            
            /* Transitions */
            .transition {
              text-transform: uppercase;
              text-align: right;
              margin-top: 1em;
              margin-bottom: 1em;
              margin-right: 0;
              page-break-after: avoid;
            }
            
            /* Centered Text */
            .centered {
              text-align: center;
              margin-top: 1em;
              margin-bottom: 1em;
            }
            
            hr {
              visibility: hidden;
              margin: 0;
              padding: 0;
              page-break-after: always;
              height: 0;
            }

          </style>
        </head>
        <body>
          ${title_page ? `<div class="title-page">${title_page}</div>` : ''}
          <div class="script-content">
              ${script}
          </div>
        </body>
      </html>
    `;

    await page.setContent(content, { waitUntil: 'networkidle0' });
    
    // Improved pagination logic
    const pdfBuffer = await page.pdf({ 
        format: 'letter',
        printBackground: true,
        displayHeaderFooter: true, // This enables the header
        // This template adds the page number to the top right of each page
        headerTemplate: `<div style="font-family: 'Courier Prime', 'Courier New', Courier, monospace; font-size: 12pt; text-align: right; width: calc(100% - 2in); padding-top: 0.5in; padding-right: 1in;"><span class="pageNumber"></span>.</div>`,
        footerTemplate: '<div></div>', // This ensures the footer is empty
        // Use standard 1-inch margins, which Puppeteer will manage
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
