import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    // Handle multipart/form-data
    if (!contentType.includes('multipart/form-data')) {
      console.error('Invalid Content-Type:', contentType);
      return NextResponse.json(
        { error: 'Invalid Content-Type. Expected multipart/form-data' },
        { status: 400 }
      );
    }

    let file: File | null = null;
    let password: string = '';

    try {
      const formData = await request.formData();
      file = formData.get('file') as File;
      password = formData.get('password') as string;
    } catch (e) {
      console.error('Error parsing formData:', e);
      return NextResponse.json(
        { error: 'Failed to parse form data' },
        { status: 400 }
      );
    }

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    console.log('File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
      passwordLength: password.length,
    });

    // Convert file to buffer for processing
    const buffer = await file.arrayBuffer();
    
    // TODO: Implement actual PDF parsing and analysis
    // This would involve:
    // 1. Extracting text from PDF using a library like pdf-parse or pdfjs
    // 2. Parsing the CAS statement format
    // 3. Extracting fund details, holdings, NAV values, etc.
    // 4. Running analysis and generating insights
    // 5. Storing results and returning report ID

    const reportId = `cas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log('CAS analysis queued for report:', reportId);

    return NextResponse.json({
      success: true,
      reportId,
      message: 'PDF received and queued for analysis',
      fileSize: buffer.byteLength,
      fileName: file.name,
    });

  } catch (error: any) {
    console.error('CAS Analysis Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process CAS',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
