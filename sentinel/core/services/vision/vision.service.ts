import { config } from '../../config/index.js';
import { CLIPVisionEncoder } from '../models/clip.js';
import { OCREngine } from '../models/ocr.js';
import { ObjectDetector } from '../models/detection.js';
import { SceneUnderstanding } from '../models/scene.js';
import { FaceAnalyzer } from '../models/face.js';
import { ImagePreprocessor } from '../preprocessor.js';

export interface VisionInput {
  image: Buffer;
  format: 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp';
  width: number;
  height: number;
}

export interface VisionProcessingResult {
  description: string;
  tags: string[];
  embedding: number[];
  objects: DetectedObject[];
  faces: DetectedFace[];
  text: ExtractedText[];
  scene: SceneAnalysis;
  quality: ImageQuality;
  metadata: ImageMetadata;
  intent: string;
  entities: Entity[];
}

export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: BoundingBox;
  attributes: Record<string, any>;
  segmentMask?: number[][];
}

export interface DetectedFace {
  boundingBox: BoundingBox;
  landmarks: Point[];
  attributes: FaceAttributes;
  emotion: string;
  age: number;
  gender: string;
  embedding: number[];
}

export interface ExtractedText {
  text: string;
  boundingBox: BoundingBox;
  confidence: number;
  language: string;
  type: 'handwritten' | 'printed' | 'scene';
}

export interface SceneAnalysis {
  category: string;
  attributes: string[];
  activities: string[];
  objects: string[];
  people: number;
  setting: 'indoor' | 'outdoor' | 'unknown';
  timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
  weather?: string;
}

export interface ImageQuality {
  blur: number;
  noise: number;
  brightness: number;
  contrast: number;
  isReadable: boolean;
  suggestions: string[];
}

export interface ImageMetadata {
  format: string;
  width: number;
  height: number;
  colorSpace: string;
  hasAlpha: boolean;
  exif?: Record<string, any>;
}

export interface Entity {
  type: 'person' | 'object' | 'location' | 'text' | 'brand';
  value: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface FaceAttributes {
  smiling: boolean;
  eyeglasses: boolean;
  sunglasses: boolean;
  beard: boolean;
  mustache: boolean;
  sideburns: boolean;
  makeup: boolean;
  hairColor: string;
  eyeColor: string;
}

export class VisionService {
  private clipEncoder: CLIPVisionEncoder;
  private ocr: OCREngine;
  private objectDetector: ObjectDetector;
  private sceneUnderstanding: SceneUnderstanding;
  private faceAnalyzer: FaceAnalyzer;
  private preprocessor: ImagePreprocessor;
  private cache: Map<string, CachedVisionResult>;

  constructor() {
    this.clipEncoder = new CLIPVisionEncoder({ model: 'ViT-L/14' });
    this.ocr = new OCREngine({ languages: ['en', 'es', 'de', 'fr', 'zh', 'ja'] });
    this.objectDetector = new ObjectDetector({ model: 'yolov8x' });
    this.sceneUnderstanding = new SceneUnderstanding({ model: 'depth-anything' });
    this.faceAnalyzer = new FaceAnalyzer({ model: 'retinaface' });
    this.preprocessor = new ImagePreprocessor();
    this.cache = new Map();
  }

  async process(image: Buffer, context?: Context): Promise<VisionProcessingResult> {
    const cacheKey = this.generateCacheKey(image);
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      return cached.result;
    }

    const imageData = await this.preprocessor.load(image);
    const imageForProcessing = await this.preprocessor.prepareForModel(imageData);

    const [
      clipEmbedding,
      objectDetection,
      faceDetection,
      ocrResult,
      sceneAnalysis,
      qualityAssessment,
    ] = await Promise.all([
      this.clipEncoder.encode(imageForProcessing),
      this.objectDetector.detect(imageForProcessing),
      this.faceAnalyzer.analyze(imageForProcessing),
      this.ocr.recognize(imageForProcessing),
      this.sceneUnderstanding.analyze(imageForProcessing),
      this.assessQuality(imageData),
    ]);

    const description = await this.generateDescription(
      imageData,
      objectDetection.objects,
      sceneAnalysis,
      context
    );

    const intentResult = await this.extractIntentFromVision(
      description,
      objectDetection,
      sceneAnalysis,
      ocrResult
    );

    const result: VisionProcessingResult = {
      description,
      tags: this.generateTags(objectDetection, sceneAnalysis, faceDetection),
      embedding: clipEmbedding,
      objects: objectDetection.objects,
      faces: faceDetection,
      text: ocrResult,
      scene: sceneAnalysis,
      quality: qualityAssessment,
      metadata: {
        format: imageData.format,
        width: imageData.width,
        height: imageData.height,
        colorSpace: imageData.colorSpace,
        hasAlpha: imageData.hasAlpha,
        exif: imageData.exif,
      },
      intent: intentResult.intent,
      entities: intentResult.entities,
    };

    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl: 600000,
    });

    return result;
  }

  async compareImages(
    image1: Buffer,
    image2: Buffer
  ): Promise<ImageComparisonResult> {
    const [result1, result2] = await Promise.all([
      this.process(image1),
      this.process(image2),
    ]);

    const similarity = this.cosineSimilarity(result1.embedding, result2.embedding);

    return {
      similarity,
      objectsInCommon: result1.objects
        .filter((obj1) =>
          result2.objects.some(
            (obj2) =>
              obj1.label === obj2.label &&
              obj1.confidence > 0.7 &&
              obj2.confidence > 0.7
          )
        )
        .map((obj) => obj.label),
      sceneDifference: this.calculateSceneDifference(result1.scene, result2.scene),
      faceMatch: this.compareFaces(result1.faces, result2.faces),
    };
  }

  async findSimilarImages(
    query: Buffer,
    imageDatabase: Buffer[],
    topK: number = 5
  ): Promise<SimilarImageResult[]> {
    const queryEmbedding = (await this.process(query)).embedding;

    const similarities = await Promise.all(
      imageDatabase.map(async (img, index) => {
        const imgEmbedding = (await this.process(img)).embedding;
        return {
          index,
          similarity: this.cosineSimilarity(queryEmbedding, imgEmbedding),
        };
      })
    );

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map((sim) => ({
        index: sim.index,
        similarity: sim.similarity,
      }));
  }

  async describeForAccessibility(image: Buffer): Promise<AccessibilityDescription> {
    const result = await this.process(image);

    const accessibilityDescription = [
      this.describeScene(result.scene),
      this.describePeople(result.faces),
      this.describeObjects(result.objects, result.scene),
      this.describeText(result.text),
      this.describeLayout(result.objects),
    ]
      .filter((desc) => desc.length > 0)
      .join(' ');

    return {
      shortDescription: result.description.slice(0, 140),
      detailedDescription: accessibilityDescription,
      altText: result.description,
      objectLabels: result.objects.map((obj) => obj.label),
      textContent: result.text.map((t) => t.text).join(' '),
    };
  }

  private async generateDescription(
    imageData: any,
    objects: DetectedObject[],
    scene: SceneAnalysis,
    context?: Context
  ): Promise<string> {
    const visionLM = require('../models/vision-lm');
    const prompt = this.buildDescriptionPrompt(objects, scene, context);

    return visionLM.generate(imageData, {
      prompt,
      maxTokens: 150,
      temperature: 0.7,
    });
  }

  private buildDescriptionPrompt(
    objects: DetectedObject[],
    scene: SceneAnalysis,
    context?: Context
  ): string {
    const objectNames = objects
      .filter((o) => o.confidence > 0.6)
      .slice(0, 10)
      .map((o) => o.label)
      .join(', ');

    const prompt = `Describe this image in detail. Key elements: ${scene.category}. Objects visible: ${objectNames}. Setting: ${scene.setting}. `;

    if (context?.previousQueries) {
      prompt += `Context: The user is asking about ${context.previousQueries.join(', ')}. `;
    }

    return prompt + 'Provide a natural, concise description.';
  }

  private generateTags(
    objects: DetectedObject[],
    scene: SceneAnalysis,
    faces: DetectedFace[]
  ): string[] {
    const tags = new Set<string>();

    tags.add(scene.category.toLowerCase());
    tags.add(scene.setting);

    objects
      .filter((o) => o.confidence > 0.7)
      .slice(0, 20)
      .forEach((o) => tags.add(o.label.toLowerCase()));

    faces.forEach((f) => {
      tags.add('person');
      tags.add(f.emotion.toLowerCase());
    });

    if (scene.activities.length > 0) {
      scene.activities.slice(0, 3).forEach((a) => tags.add(a.toLowerCase()));
    }

    return Array.from(tags).slice(0, 30);
  }

  private async extractIntentFromVision(
    description: string,
    objects: DetectedObject[],
    scene: SceneAnalysis,
    text: ExtractedText[]
  ): Promise<{ intent: string; entities: Entity[] } {
    const intentLM = require('../models/intent-classifier');

    return intentLM.classifyFromVision(description, objects, scene, text);
  }

  private async assessQuality(imageData: any): Promise<ImageQuality> {
    const blur = await this.calculateBlur(imageData);
    const noise = await this.calculateNoise(imageData);
    const brightness = await this.calculateBrightness(imageData);
    const contrast = await this.calculateContrast(imageData);

    const suggestions: string[] = [];
    if (blur > 0.3) suggestions.push('Image is blurry, try to stabilize your camera.');
    if (noise > 0.4) suggestions.push('Image has high noise, improve lighting.');
    if (brightness < 0.2) suggestions.push('Image is too dark, increase brightness.');
    if (brightness > 0.8) suggestions.push('Image is too bright, reduce lighting.');

    return {
      blur,
      noise,
      brightness,
      contrast,
      isReadable: blur < 0.3 && noise < 0.4 && brightness > 0.2 && brightness < 0.8,
      suggestions,
    };
  }

  private calculateBlur(imageData: any): Promise<number> {
    return Promise.resolve(0);
  }

  private calculateNoise(imageData: any): Promise<number> {
    return Promise.resolve(0);
  }

  private calculateBrightness(imageData: any): Promise<number> {
    return Promise.resolve(0);
  }

  private calculateContrast(imageData: any): Promise<number> {
    return Promise.resolve(0);
  }

  private generateCacheKey(image: Buffer): string {
    const hash = require('crypto')
      .createHash('sha256')
      .update(image.toString('base64').slice(0, 1000))
      .digest('hex');
    return hash;
  }

  private isExpired(cached: CachedVisionResult): boolean {
    return Date.now() - cached.timestamp > cached.ttl;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private calculateSceneDifference(
    scene1: SceneAnalysis,
    scene2: SceneAnalysis
  ): number {
    const attributesDiff = this.jaccardSimilarity(
      new Set(scene1.attributes),
      new Set(scene2.attributes)
    );
    const objectsDiff = this.jaccardSimilarity(
      new Set(scene1.objects),
      new Set(scene2.objects)
    );

    return 1 - (attributesDiff * 0.5 + objectsDiff * 0.5);
  }

  private jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  private compareFaces(
    faces1: DetectedFace[],
    faces2: DetectedFace[]
  ): FaceMatchResult[] {
    return faces1.map((face1) => {
      const match = faces2.find((face2) => {
        const similarity = this.cosineSimilarity(
          face1.embedding,
          face2.embedding
        );
        return similarity > 0.8;
      });

      return {
        face1: face1,
        matched: !!match,
        matchId: match?.embedding.slice(0, 10).join(','),
        confidence: match
          ? this.cosineSimilarity(face1.embedding, match!.embedding)
          : 0,
      };
    });
  }

  private describeScene(scene: SceneAnalysis): string {
    const parts: string[] = [];

    if (scene.setting !== 'unknown') {
      parts.push(`This appears to be an ${scene.setting} scene`);
    }

    if (scene.timeOfDay) {
      parts.push(`It looks like ${scene.timeOfDay}`);
    }

    if (scene.category) {
      parts.push(`The setting is ${scene.category}`);
    }

    if (scene.activities.length > 0) {
      parts.push(`Someone appears to be ${scene.activities.join(', ')}`);
    }

    return parts.join('. ') + '.';
  }

  private describePeople(faces: DetectedFace[]): string {
    if (faces.length === 0) return '';

    const descriptions = faces.map((face, index) => {
      const parts: string[] = [];

      parts.push(`Person ${index + 1}`);

      if (face.emotion) {
        parts.push(`looks ${face.emotion}`);
      }

      if (face.attributes.eyeglasses) {
        parts.push('is wearing glasses');
      }

      if (face.attributes.beard) {
        parts.push('has a beard');
      }

      return parts.join(' and ');
    });

    return `There ${faces.length === 1 ? 'is' : 'are'} ${faces.length} ${faces.length === 1 ? 'person' : 'people'} in the image. ${descriptions.join('. ')}.`;
  }

  private describeObjects(
    objects: DetectedObject[],
    scene: SceneAnalysis
  ): string {
    const importantObjects = objects
      .filter((o) => o.confidence > 0.7)
      .slice(0, 10);

    if (importantObjects.length === 0) return '';

    const objectNames = importantObjects.map((o) => o.label).join(', ');

    return `Notable objects include: ${objectNames}.`;
  }

  private describeText(text: ExtractedText[]): string {
    if (text.length === 0) return '';

    const readableText = text
      .filter((t) => t.confidence > 0.6)
      .map((t) => t.text)
      .join(' ');

    if (readableText.length === 0) return '';

    return `The image contains text: "${readableText.slice(0, 200)}${readableText.length > 200 ? '...' : ''}"`;
  }

  private describeLayout(objects: DetectedObject[]): string {
    if (objects.length === 0) return '';

    const positions = {
      left: objects.filter((o) => o.boundingBox.x < 0.33).length,
      center: objects.filter(
        (o) => o.boundingBox.x >= 0.33 && o.boundingBox.x <= 0.66
      ).length,
      right: objects.filter((o) => o.boundingBox.x > 0.66).length,
    };

    const mainAreas: string[] = [];

    if (positions.center > positions.left && positions.center > positions.right) {
      mainAreas.push('center');
    }

    if (positions.left > positions.center && positions.left > positions.right) {
      mainAreas.push('left side');
    }

    if (positions.right > positions.center && positions.right > positions.left) {
      mainAreas.push('right side');
    }

    if (mainAreas.length > 0) {
      return `The main focus appears to be on the ${mainAreas.join(' and ')} of the image.`;
    }

    return '';
  }
}

interface CachedVisionResult {
  result: VisionProcessingResult;
  timestamp: number;
  ttl: number;
}

interface Context {
  sessionId: string;
  userId: string;
  previousQueries?: string[];
}

interface ImageComparisonResult {
  similarity: number;
  objectsInCommon: string[];
  sceneDifference: number;
  faceMatch: FaceMatchResult[];
}

interface SimilarImageResult {
  index: number;
  similarity: number;
}

interface AccessibilityDescription {
  shortDescription: string;
  detailedDescription: string;
  altText: string;
  objectLabels: string[];
  textContent: string;
}

interface FaceMatchResult {
  face1: DetectedFace;
  matched: boolean;
  matchId?: string;
  confidence: number;
}

export { VisionService };
