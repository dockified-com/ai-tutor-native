import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { response } = body;
  
  const encoder = new TextEncoder();
  const isPass = response.toLowerCase().includes('state'); // Simple mock heuristic
  
  const stream = new ReadableStream({
    async start(controller) {
      const mockFeedback = isPass
        ? "Excellent explanation. You clearly understand that state drives UI changes in React."
        : "Not quite. Think about how React knows when to re-render the UI. What holds the data that changes over time?";
        
      const words = mockFeedback.split(' ');
      
      await new Promise(resolve => setTimeout(resolve, 500));

      for (const word of words) {
        const json = JSON.stringify({ text: word + ' ' });
        controller.enqueue(encoder.encode(`data: ${json}\n\n`));
        await new Promise(resolve => setTimeout(resolve, 80));
      }
      
      // Final payload with passed boolean
      const resultJson = JSON.stringify({ passed: isPass });
      controller.enqueue(encoder.encode(`data: ${resultJson}\n\n`));
      
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
