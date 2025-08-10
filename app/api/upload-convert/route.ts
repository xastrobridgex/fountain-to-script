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
              margin: 0;
            }
            
            /* Body - Main container */
            body {
              font-family: 'Courier Prime', 'Courier New', Courier, monospace;
              font-size: 12pt;
              line-height: 1;
              margin: 0;
              padding: 0;
              width: 8.5in;
              background: white;
            }
            
            /* Page container for each page */
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
            
            /* Page numbers */
            .page-number {
              position: absolute;
              top: 0.5in;
              right: 1in;
              font-size: 12pt;
            }
            
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
              text-decoration: underline;
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
            
            .title-page .date,
            .title-page .contact,
            .title-page .notes {
              font-size: 12pt;
              position: absolute;
              left: 1.5in;
              right: 1in;
            }
            
            .title-page .date {
              bottom: 3in;
            }
            
            .title-page .contact {
              bottom: 2in;
              text-align: left;
            }
            
            .title-page .notes {
              bottom: 1.5in;
              text-align: left;
            }
            
            /* Script Content Container */
            .script-content {
              width: 6in; /* 8.5in - 1.5in left - 1in right */
            }
            
            /* Scene Headings */
            .scene-heading {
              font-weight: normal;
              text-transform: uppercase;
              margin-top: 2em;
              margin-bottom: 1em;
              page-break-after: avoid;
              position: relative;
            }
            
            .scene-number-left,
            .scene-number-right {
              position: absolute;
              font-weight: normal;
            }
            
            .scene-number-left {
              left: -0.75in;
            }
            
            .scene-number-right {
              right: -0.5in;
            }
            
            /* Action Lines */
            .action {
              margin-top: 1em;
              margin-bottom: 1em;
              width: 6in;
              page-break-inside: avoid;
            }
            
            /* Character Names */
            .character {
              text-transform: uppercase;
              margin-top: 1em;
              margin-bottom: 0;
              margin-left: 2.2in; /* Centers at approximately 3.7in from left edge */
              page-break-after: avoid;
            }
            
            /* Dialogue */
            .dialogue {
              margin-top: 0;
              margin-bottom: 0;
              margin-left: 1in;
              margin-right: 1.5in;
              width: 3.5in;
              page-break-inside: avoid;
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
            
            /* Text Emphasis */
            b {
              font-weight: bold;
            }
            
            i {
              font-style: italic;
            }
            
            u {
              text-decoration: underline;
            }
            
            /* Page break handling */
            hr {
              visibility: hidden;
              margin: 0;
              padding: 0;
              page-break-after: always;
              height: 0;
            }
            
            /* Ensure consistent line spacing */
            .scene-heading,
            .action,
            .character,
            .dialogue,
            .parenthetical,
            .transition,
            .centered {
              line-height: 1;
            }
            
            /* Dual dialogue support (future enhancement) */
            .dual-dialogue-container {
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            
            .dual-dialogue-left,
            .dual-dialogue-right {
              width: 45%;
            }
            
            /* CONTINUED indicators (future enhancement) */
            .continued-top {
              text-transform: uppercase;
              margin-bottom: 1em;
            }
            
            .continued-bottom {
              text-transform: uppercase;
              text-align: right;
              margin-top: 1em;
            }
          </style>
        </head>
        <body>
          ${title_page ? `<div class="title-page">${title_page}</div>` : ''}
          <div class="page">
            <div class="page-number">1.</div>
            <div class="script-content">
              ${script}
            </div>
          </div>
        </body>
      </html>
    `;

    await page.setContent(content, { waitUntil: 'networkidle0' });
    
    // Improved pagination logic
    await page.evaluate(() => {
      const scriptContent = document.querySelector('.script-content');
      if (!scriptContent) return;
      
      const elements = Array.from(scriptContent.children);
      const pageHeight = 9 * 96; // 9 inches in pixels (assuming 96 DPI)
      let currentPage: HTMLElement | null = document.querySelector('.page');
      let currentContentContainer = scriptContent;
      let currentHeight = 0;
      let pageNumber = 1;
      
      elements.forEach((element) => {
        const elementHeight = (element as HTMLElement).offsetHeight;
        
        if (currentHeight + elementHeight > pageHeight && currentHeight > 0) {
          pageNumber++;
          const newPage = document.createElement('div');
          newPage.className = 'page';
          
          const pageNumberDiv = document.createElement('div');
          pageNumberDiv.className = 'page-number';
          pageNumberDiv.textContent = `${pageNumber}.`;
          newPage.appendChild(pageNumberDiv);
          
          const newScriptContent = document.createElement('div');
          newScriptContent.className = 'script-content';
          newPage.appendChild(newScriptContent);
          
          // This is the safety check that fixes the error
          if (currentPage) {
            currentPage.after(newPage);
          }
          
          currentPage = newPage;
          currentContentContainer = newScriptContent;
          currentHeight = 0;
        }
        
        currentContentContainer.appendChild(element);
        currentHeight += elementHeight;
      });
    });

    const pdfBuffer = await page.pdf({ 
        format: 'letter',
        printBackground: true,
        displayHeaderFooter: false,
        margin: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
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
