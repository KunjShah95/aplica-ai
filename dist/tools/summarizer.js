import axios from 'axios';
export class SummarizerTool {
    openaiApiKey;
    constructor(options) {
        this.openaiApiKey = options?.openaiApiKey || process.env.OPENAI_API_KEY;
    }
    async summarize(options) {
        if (!this.openaiApiKey) {
            return { success: false, error: 'OpenAI API key not configured' };
        }
        try {
            const styleInstructions = {
                brief: 'Provide a very brief 1-2 sentence summary.',
                detailed: 'Provide a comprehensive summary covering all key points.',
                bullets: 'Provide key points as a bulleted list.',
            };
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `You are a text summarization tool. ${styleInstructions[options.style || 'brief']} Also extract 3-5 key points as an array. Return a JSON object with "summary" and "keyPoints" fields.`,
                    },
                    {
                        role: 'user',
                        content: options.text,
                    },
                ],
                temperature: 0.3,
            }, {
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            const content = response.data.choices[0].message.content;
            const parsed = JSON.parse(content);
            return {
                success: true,
                summary: parsed.summary,
                keyPoints: parsed.keyPoints,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async summarizeUrl(url, options) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            const text = this.extractTextFromHtml(response.data);
            return this.summarize({ text, maxLength: options?.maxLength });
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async extractiveSummary(text, maxSentences = 5) {
        const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
        if (sentences.length <= maxSentences) {
            return { success: true, summary: text };
        }
        const scoredSentences = sentences.map((sentence) => {
            const words = sentence.toLowerCase().split(/\s+/);
            const score = words.length;
            return { sentence: sentence.trim(), score };
        });
        scoredSentences.sort((a, b) => b.score - a.score);
        const topSentences = scoredSentences.slice(0, maxSentences);
        topSentences.sort((a, b) => {
            const indexA = sentences.indexOf(a.sentence);
            const indexB = sentences.indexOf(b.sentence);
            return indexA - indexB;
        });
        return {
            success: true,
            summary: topSentences.map((s) => s.sentence).join('. ') + '.',
        };
    }
    extractTextFromHtml(html) {
        let text = html;
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<[^>]+>/g, ' ');
        text = text.replace(/&nbsp;/g, ' ');
        text = text.replace(/&amp;/g, '&');
        text = text.replace(/&lt;/g, '<');
        text = text.replace(/&gt;/g, '>');
        text = text.replace(/&quot;/g, '"');
        text = text.replace(/\s+/g, ' ').trim();
        return text;
    }
}
export const summarizerTool = new SummarizerTool();
export default summarizerTool;
//# sourceMappingURL=summarizer.js.map