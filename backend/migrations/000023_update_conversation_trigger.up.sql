DROP TRIGGER IF EXISTS trigger_conversation_last_message ON messages;
DROP FUNCTION IF EXISTS update_conversation_last_message();

CREATE OR REPLACE FUNCTION update_conversation_last_message_and_content()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET 
        last_message_at = NEW.created_at,
        last_message = NEW.content,
        message_count = message_count + 1
    WHERE id = NEW.conversation_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversation_last_message_and_content
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message_and_content();