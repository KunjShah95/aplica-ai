export var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["USER"] = "USER";
    Role["GUEST"] = "GUEST";
})(Role || (Role = {}));
export var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
    UserStatus["DELETED"] = "DELETED";
})(UserStatus || (UserStatus = {}));
export var TeamRole;
(function (TeamRole) {
    TeamRole["OWNER"] = "OWNER";
    TeamRole["ADMIN"] = "ADMIN";
    TeamRole["MEMBER"] = "MEMBER";
    TeamRole["VIEWER"] = "VIEWER";
})(TeamRole || (TeamRole = {}));
export var MessageRole;
(function (MessageRole) {
    MessageRole["USER"] = "USER";
    MessageRole["ASSISTANT"] = "ASSISTANT";
    MessageRole["SYSTEM"] = "SYSTEM";
    MessageRole["TOOL"] = "TOOL";
})(MessageRole || (MessageRole = {}));
export var MemoryType;
(function (MemoryType) {
    MemoryType["FACT"] = "FACT";
    MemoryType["PREFERENCE"] = "PREFERENCE";
    MemoryType["CONTEXT"] = "CONTEXT";
    MemoryType["ENTITY"] = "ENTITY";
    MemoryType["SKILL"] = "SKILL";
    MemoryType["CONVERSATION_SUMMARY"] = "CONVERSATION_SUMMARY";
})(MemoryType || (MemoryType = {}));
export var DocumentSourceType;
(function (DocumentSourceType) {
    DocumentSourceType["FILE_UPLOAD"] = "FILE_UPLOAD";
    DocumentSourceType["URL"] = "URL";
    DocumentSourceType["TEXT"] = "TEXT";
    DocumentSourceType["API"] = "API";
})(DocumentSourceType || (DocumentSourceType = {}));
export var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["PENDING"] = "PENDING";
    DocumentStatus["PROCESSING"] = "PROCESSING";
    DocumentStatus["INDEXED"] = "INDEXED";
    DocumentStatus["FAILED"] = "FAILED";
})(DocumentStatus || (DocumentStatus = {}));
export var NotificationType;
(function (NotificationType) {
    NotificationType["INFO"] = "INFO";
    NotificationType["SUCCESS"] = "SUCCESS";
    NotificationType["WARNING"] = "WARNING";
    NotificationType["ERROR"] = "ERROR";
    NotificationType["TASK_COMPLETED"] = "TASK_COMPLETED";
    NotificationType["WORKFLOW_TRIGGERED"] = "WORKFLOW_TRIGGERED";
    NotificationType["MENTION"] = "MENTION";
    NotificationType["SHARE"] = "SHARE";
})(NotificationType || (NotificationType = {}));
//# sourceMappingURL=prisma-types.js.map