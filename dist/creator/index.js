import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
export class ImageGenerator {
    galleryPath;
    openaiApiKey;
    cache = new Map();
    constructor(options = {}) {
        this.galleryPath = options.galleryPath || './gallery';
        this.openaiApiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
        if (!fs.existsSync(this.galleryPath)) {
            fs.mkdirSync(this.galleryPath, { recursive: true });
        }
    }
    async generate(request) {
        const iteration = request.iterations || 1;
        let currentPrompt = request.prompt;
        let lastImage = null;
        for (let i = 0; i < iteration; i++) {
            if (i > 0 && lastImage?.feedback) {
                currentPrompt = this.iteratePrompt(currentPrompt, lastImage.feedback);
            }
            const image = await this.callAPI(currentPrompt, request);
            lastImage = image;
        }
        if (lastImage) {
            this.cache.set(lastImage.id, lastImage);
            await this.saveToGallery(lastImage);
        }
        return lastImage;
    }
    async callAPI(prompt, request) {
        if (request.model === 'flux') {
            return this.generateWithFlux(prompt);
        }
        return this.generateWithDALL - E(prompt, request);
    }
    async generateWithDALL;
}
-E(prompt, string, request, ImageGenerationRequest);
Promise < GeneratedImage > {
    : .openaiApiKey
};
{
    throw new Error('OpenAI API key not configured');
}
const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        model: request.model || 'dall-e-3',
        prompt,
        n: 1,
        size: request.size || '1024x1024',
        quality: request.quality || 'standard',
        style: request.style || 'vivid',
    }),
});
const data = await response.json();
const image = {
    id: randomUUID(),
    url: data.data[0].url,
    prompt,
    model: request.model || 'dall-e-3',
    createdAt: new Date(),
    iterations: 1,
};
return image;
async;
generateWithFlux(prompt, string);
Promise < GeneratedImage > {
    console, : .log('Generating with FLUX (placeholder - integrate FLUX API)'),
    return: {
        id: randomUUID(),
        url: `https://placeholder.flux/image/${randomUUID()}.png`,
        prompt,
        model: 'flux',
        createdAt: new Date(),
        iterations: 1,
    }
};
iteratePrompt(originalPrompt, string, feedback, string);
string;
{
    const feedbackLower = feedback.toLowerCase();
    let modifier = '';
    if (feedbackLower.includes('moodier') || feedbackLower.includes('darker')) {
        modifier += 'darker atmosphere, moody lighting, ';
    }
    if (feedbackLower.includes('brighter')) {
        modifier += 'bright lighting, vibrant, ';
    }
    if (feedbackLower.includes('simpler')) {
        modifier += 'minimalist, simple composition, ';
    }
    if (feedbackLower.includes('detail')) {
        modifier += 'highly detailed, intricate, ';
    }
    if (feedbackLower.includes('color')) {
        modifier += 'vibrant colors, colorful, ';
    }
    if (feedbackLower.includes('bw') || feedbackLower.includes('black and white')) {
        modifier += 'black and white, monochrome, ';
    }
    if (modifier) {
        return `${modifier}${originalPrompt}`;
    }
    return originalPrompt;
}
async;
iterate(imageId, string, feedback, string);
Promise < GeneratedImage | null > {
    const: original = this.cache.get(imageId),
    if(, original) {
        return null;
    },
    original, : .feedback = feedback,
    const: newImage = await this.generate({
        prompt: original.prompt,
        model: original.model,
        iterations: 1,
    }),
    return: newImage
};
async;
saveToGallery(image, GeneratedImage);
Promise < void  > {
    const: filename = `${image.id}.json`,
    const: filepath = path.join(this.galleryPath, filename),
    fs, : .writeFileSync(filepath, JSON.stringify(image, null, 2))
};
async;
getGallery(userId, string);
Promise < GeneratedImage[] > {
    const: files = fs.readdirSync(this.galleryPath).filter(f => f.endsWith('.json')),
    const: images, GeneratedImage, []:  = [],
    for(, file, of, files) {
        const content = fs.readFileSync(path.join(this.galleryPath, file), 'utf-8');
        const image = JSON.parse(content);
        images.push(image);
    },
    return: images.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
};
export const imageGenerator = new ImageGenerator();
export class MusicComposer {
    sunoApiKey;
    constructor(options = {}) {
        this.sunoApiKey = options.sunoApiKey || process.env.SUNO_API_KEY;
    }
    async compose(request) {
        const duration = request.duration || 30;
        const prompt = this.buildPrompt(request);
        if (this.sunoApiKey) {
            return this.composeWithSuno(prompt, duration);
        }
        return this.composeLocally(request);
    }
    buildPrompt(request) {
        const parts = [request.mood];
        if (request.genre) {
            parts.push(request.genre);
        }
        if (request.tempo) {
            parts.push(`${request.tempo} BPM`);
        }
        if (request.instruments?.length) {
            parts.push(`featuring ${request.instruments.join(', ')}`);
        }
        return parts.join(', ');
    }
    async composeWithSuno(prompt, duration) {
        console.log('Composing with Suno API (placeholder)');
        return {
            id: randomUUID(),
            url: `https://placeholder.suno/music/${randomUUID()}.mp3`,
            duration,
            prompt,
            createdAt: new Date(),
        };
    }
    async composeLocally(request) {
        console.log('Composing locally with MusicGen (placeholder)');
        return {
            id: randomUUID(),
            url: `https://placeholder.local/music/${randomUUID()}.mp3`,
            duration: request.duration || 30,
            prompt: request.mood,
            createdAt: new Date(),
        };
    }
}
export const musicComposer = new MusicComposer();
export class VideoStoryboard {
    llmApiKey;
    constructor(options = {}) {
        this.llmApiKey = options.llmApiKey || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
    }
    async generate(request) {
        const duration = request.duration || 300;
        const sceneCount = Math.max(3, Math.floor(duration / 60));
        const sceneDuration = duration / sceneCount;
        const scenes = [];
        for (let i = 0; i < sceneCount; i++) {
            scenes.push({
                sceneNumber: i + 1,
                title: `Scene ${i + 1}`,
                duration: sceneDuration,
                visualDescription: this.generateVisualDescription(request.topic, i, sceneCount),
                audioDescription: this.generateAudioDescription(request.topic, i, sceneCount),
            });
        }
        const fullScript = this.generateFullScript(request.topic, scenes);
        return {
            id: randomUUID(),
            topic: request.topic,
            totalDuration: duration,
            scenes,
            fullScript,
            createdAt: new Date(),
        };
    }
    generateVisualDescription(topic, sceneIndex, totalScenes) {
        const opening = sceneIndex === 0 ? 'Wide establishing shot of ' : '';
        const closing = sceneIndex === totalScenes - 1 ? ', final shot' : '';
        return `${opening}${topic} concept, visual storytelling, cinematic quality${closing}`;
    }
    generateAudioDescription(topic, sceneIndex, totalScenes) {
        const music = sceneIndex === 0 ? 'Upbeat intro music' :
            sceneIndex === totalScenes - 1 ? 'Concluding music fade' :
                'Background music complementing visuals';
        return `${music}, voice narration describing ${topic}`;
    }
    generateFullScript(topic, scenes) {
        const lines = [
            `# Video Script: ${topic}`,
            '',
            `Duration: ${scenes.reduce((sum, s) => sum + s.duration, 0)} seconds`,
            '',
            '---',
            '',
        ];
        for (const scene of scenes) {
            lines.push(`## Scene ${scene.sceneNumber}: ${scene.title} (${scene.duration}s)`);
            lines.push('');
            lines.push(`**Visual:** ${scene.visualDescription}`);
            lines.push(`**Audio:** ${scene.audioDescription}`);
            lines.push('');
        }
        return lines.join('\n');
    }
    async exportToJSON(storyboard) {
        return JSON.stringify(storyboard, null, 2);
    }
    async exportToMarkdown(storyboard) {
        return this.generateFullScript(storyboard.topic, storyboard.scenes);
    }
}
export const videoStoryboard = new VideoStoryboard();
//# sourceMappingURL=index.js.map