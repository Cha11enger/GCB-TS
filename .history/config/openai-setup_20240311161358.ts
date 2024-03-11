// config/openai-setup.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

// async function analyzeTextWithGPT(promptText: string): Promise<string> {
//   let responseContent = "";
//   const stream = await openai.chat.completions.create({
//     model: "gpt-3.5-turbo",
//     messages: [{ role: "user", content: promptText }],
//     stream: true,
//   });

//   for await (const chunk of stream) {
//     responseContent += chunk.choices[0]?.delta?.content || "";
//   }

//   return responseContent.trim();
// }

async function analyzeTextWithGPT(promptText: string): Promise<string> {
  let responseContent = "";
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: promptText }],
      stream: true,
    });

    for await (const chunk of stream) {
      responseContent += chunk.choices[0]?.delta?.content || "";
    }
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    responseContent = "Error processing your request. Please try again.";
  }

  return responseContent.trim();
}

export { analyzeTextWithGPT };
