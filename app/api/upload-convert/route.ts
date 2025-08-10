// Import necessary libraries
import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
// We dynamically import pdf-parse below, so the top-level import is removed.
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
const Fountain = require('fountain-js');

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

    // 3. PARSE THE TEXT WITH FOUNTAIN-JS
    const fountainInstance = new Fountain();
    const output = fountainInstance.parse(rawText);
    const scriptHtml = output.html.script;

    // 4. GENERATE THE PDF USING PUPPETEER
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });

    const page = await browser.newPage();

    // Create the HTML content for our PDF with proper screenplay styling
    const content = `
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', Courier, monospace; margin: 1in; line-height: 1.5; }
            .dialogue { margin-left: 2.5in; margin-right: 1.5in; max-width: 3.5in; }
            .character { margin-left: 3.7in; text-transform: uppercase; }
            .parenthetical { margin-left: 3.1in; }
            .scene-heading { text-transform: uppercase; margin-top: 1.5em; margin-bottom: 1.5em; }
            .action { margin-top: 1em; margin-bottom: 1em; }
            .transition { text-transform: uppercase; text-align: right; margin-top: 1.5em; margin-bottom: 1.5em; }
          </style>
        </head>
        <body>
          ${scriptHtml}
        </body>
      </html>
    `;

    await page.setContent(content, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

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
