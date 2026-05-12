-- ============================================================
--  V4 — AI Chat tables
-- ============================================================

CREATE TABLE chat_conversations (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255),
    created_at TIMESTAMPTZ  DEFAULT NOW(),
    updated_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id              BIGSERIAL    PRIMARY KEY,
    conversation_id BIGINT       NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role            VARCHAR(20)  NOT NULL,   -- USER | ASSISTANT
    content         TEXT         NOT NULL,
    tool_calls      TEXT,                    -- JSON array of {tool, summary} for UI display
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_chat_conv_user ON chat_conversations(user_id, created_at DESC);
CREATE INDEX idx_chat_msg_conv  ON chat_messages(conversation_id, created_at ASC);
