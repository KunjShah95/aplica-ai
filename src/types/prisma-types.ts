export enum Role {
    ADMIN = 'ADMIN',
    USER = 'USER',
    GUEST = 'GUEST'
}

export enum UserStatus {
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    DELETED = 'DELETED'
}

export enum TeamRole {
    OWNER = 'OWNER',
    ADMIN = 'ADMIN',
    MEMBER = 'MEMBER',
    VIEWER = 'VIEWER'
}

export enum MessageRole {
    USER = 'USER',
    ASSISTANT = 'ASSISTANT',
    SYSTEM = 'SYSTEM',
    TOOL = 'TOOL'
}

export enum MemoryType {
    FACT = 'FACT',
    PREFERENCE = 'PREFERENCE',
    CONTEXT = 'CONTEXT',
    ENTITY = 'ENTITY',
    SKILL = 'SKILL',
    CONVERSATION_SUMMARY = 'CONVERSATION_SUMMARY'
}

export enum DocumentSourceType {
    FILE_UPLOAD = 'FILE_UPLOAD',
    URL = 'URL',
    TEXT = 'TEXT',
    API = 'API'
}

export enum DocumentStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    INDEXED = 'INDEXED',
    FAILED = 'FAILED'
}

export enum NotificationType {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    TASK_COMPLETED = 'TASK_COMPLETED',
    WORKFLOW_TRIGGERED = 'WORKFLOW_TRIGGERED',
    MENTION = 'MENTION',
    SHARE = 'SHARE'
}
