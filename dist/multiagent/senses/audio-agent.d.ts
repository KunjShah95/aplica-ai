import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
/**
 * Audio Agent - Speech-to-text transcription with diarization
 */
export declare class AudioAgent extends Agent {
    constructor(options: AgentOptions);
    /**
     * Transcribe audio with speaker diarization
     */
    transcribeWithDiarization(audioUrl: string, language?: string): Promise<{
        transcript: TranscriptSegment[];
        summary: string[];
        actionItems: ActionItem[];
        decisions: Decision[];
    }>;
    /**
     * Transcribe audio to text segments
     */
    private transcribe;
    /**
     * Apply speaker diarization to segments
     */
    private applyDiarization;
    /**
     * Generate meeting summary
     */
    private generateSummary;
    /**
     * Extract action items from transcript
     */
    private extractActionItems;
    /**
     * Extract decisions from transcript
     */
    private extractDecisions;
    /**
     * Convert speech to text without diarization
     */
    speechToText(audioUrl: string, language?: string): Promise<string>;
    /**
     * Get speaker-specific transcript
     */
    getSpeakerTranscript(audioUrl: string, speakerId: string, language?: string): Promise<string>;
    /**
     * Export transcript to various formats
     */
    exportTranscript(audioUrl: string, format?: 'json' | 'srt' | 'txt'): Promise<string>;
    /**
     * Convert transcript to SRT format
     */
    private toSRT;
    /**
     * Convert transcript to plain text
     */
    private toTXT;
    /**
     * Format timestamp for SRT
     */
    private formatTimestamp;
}
export interface TranscriptSegment {
    id: string;
    startTime: number;
    endTime: number;
    text: string;
    speaker: string;
    language: string;
}
export interface ActionItem {
    id: string;
    task: string;
    assignee: string;
    dueDate: string;
    confidence: number;
}
export interface Decision {
    id: string;
    topic: string;
    decision: string;
    rationale: string;
    madeBy: string[];
}
/**
 * Factory function to create an audio agent
 */
export declare function createAudioAgent(options: AgentOptions): AudioAgent;
//# sourceMappingURL=audio-agent.d.ts.map