CREATE TABLE user_skill_endorsements (
    skill_id UUID NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,
    endorser_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (skill_id, endorser_id)
);

CREATE INDEX idx_user_skill_endorsements_skill_id ON user_skill_endorsements(skill_id);
CREATE INDEX idx_user_skill_endorsements_endorser_id ON user_skill_endorsements(endorser_id);