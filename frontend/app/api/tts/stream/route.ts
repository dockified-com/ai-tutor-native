import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, studentContext } = body;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const contents = [
            {
              role: 'user',
              parts: [
                {
                  text: `Read the following transcript based on the audio profile and director's note.\n\n# Audio Profile\nA helpful and professional personal assistant.\n\n# Director's note\nStyle: Professional, authoritative, clear articulation with standard broadcast cadence. Pace: Natural conversational pace. Accent: American (Gen).\n\n## Context:\n${studentContext || 'No specific context.'}\n\n## Transcript:\n${prompt}`,
                },
              ],
            },
          ];

          const response = await ai.models.generateContentStream({
            model: 'gemini-3.1-flash-tts-preview',
            config: {
              temperature: 1,
              responseModalities: ['audio'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Achernar',
                  },
                },
              },
            },
            contents,
          });

          for await (const chunk of response) {
            if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
              continue;
            }

            const parts = chunk.candidates[0].content.parts;
            
            for (const part of parts) {
                if (part.inlineData) {
                    const data = {
                        type: 'audio',
                        mimeType: part.inlineData.mimeType,
                        data: part.inlineData.data, // base64
                    };
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
                } else if (part.text) {
                    const data = {
                        type: 'text',
                        text: part.text,
                    };
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
                }
            }
          }
          
          controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
