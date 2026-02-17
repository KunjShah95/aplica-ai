export interface YouTubeTranscriptSegment {
    text: string;
    start: number;
    duration: number;
}
export interface YouTubeTranscriptResult {
    success: boolean;
    videoId?: string;
    title?: string;
    author?: string;
    language?: string;
    transcripts?: YouTubeTranscriptSegment[];
    error?: string;
}
export declare class YouTubeTool {
    getTranscript(videoUrl: string, language?: string): Promise<YouTubeTranscriptResult>;
    getVideoInfo(videoUrl: string): Promise<{
        success: boolean;
        videoId?: string;
        title?: string;
        description?: string;
        author?: string;
        views?: number;
        likes?: number;
        duration?: string;
        uploadDate?: string;
        thumbnails?: string[];
        error?: string;
    }>;
    searchVideos(query: string, maxResults?: number): Promise<{
        success: boolean;
        videos?: Array<{
            title: string;
            videoId: string;
            channel: string;
            duration: string;
            views: number;
        }>;
        error?: string;
    }>;
    private extractVideoId;
    private findCaptionTracks;
    private findAuthor;
    private parseCaptions;
}
export declare const youtubeTool: YouTubeTool;
export default youtubeTool;
//# sourceMappingURL=youtube.d.ts.map