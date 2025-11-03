-- This might fail if there are tokens longer than 255 characters.
ALTER TABLE event_attendees ALTER COLUMN qr_code_token TYPE VARCHAR(255);