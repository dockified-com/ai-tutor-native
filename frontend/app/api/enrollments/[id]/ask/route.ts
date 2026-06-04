import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Simulate an SSE response
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const mockResponse = "This is a simulated AI response. Let's think about this step by step. State in React is meant to hold data that changes over time, and it triggers re-renders when updated. Does that help clarify things?";
      const words = mockResponse.split(' ');
      
      // Initial small delay
      await new Promise(resolve => setTimeout(resolve, 500));

      for (const word of words) {
        // Send as Server-Sent Event format
        const json = JSON.stringify({ text: word + ' ' });
        controller.enqueue(encoder.encode(`data: ${json}\n\n`));
        await new Promise(resolve => setTimeout(resolve, 80)); // 80ms delay per word
      }
      
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
