// Import necessary libraries
import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import { parse } from 'fountain-js';
import puppeteer from 'puppeteer-core';
import chrome from '@sparticuz/chromium';

// This is the main function that handles incoming requests
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
      const data = await pdf(buffer);
      rawText = data.text;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const { value } = await mammoth.extractRawText({ buffer });
      rawText = value;
    } else { // Default to plain text for .txt, .fountain, etc.
      rawText = buffer.toString('utf8');
    }

    if (!rawText) {
        return new NextResponse('Could not extract text from file.', { status: 400 });
    }

    // 3. PARSE THE TEXT WITH FOUNTAIN-JS
    const parsedScript = parse(rawText);
    const scriptHtml = parsedScript.script_html; // We get the script as HTML

    // 4. GENERATE THE PDF USING PUPPETEER
    // This sets up a lightweight browser instance on the server
    const browser = await puppeteer.launch({
      args: chrome.args,
      executablePath: await chrome.executablePath,
      headless: chrome.headless,
    });

    const page = await browser.newPage();

    // Create the HTML content for our PDF with proper screenplay styling
    const content = `
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', Courier, monospace; margin: 1in; }
            .dialogue { margin-left: 2in; margin-right: 1.5in; }
            .character { margin-left: 3.5in; text-transform: uppercase; }
            .parenthetical { margin-left: 3in; }
            .scene-heading { text-transform: uppercase; margin-top: 1em; margin-bottom: 1em; }
            .action { margin-bottom: 1em; }
            .transition { text-transform: uppercase; text-align: right; margin-top: 1em; margin-bottom: 1em; }
          </style>
        </head>
        <body>
          ${scriptHtml}
        </body>
      </html>
    `;

    await page.setContent(content, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });

    await browser.close();

    // 5. SEND THE PDF BACK TO THE USER
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^/.]+$/, "")}_converted.pdf"`,
      },
    });

  } catch (error) {
    console.error('Conversion Error:', error);
    return new NextResponse('Error converting file.', { status: 500 });
  }
}