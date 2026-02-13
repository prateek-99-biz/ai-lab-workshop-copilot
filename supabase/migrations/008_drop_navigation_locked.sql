-- Migration: Drop navigation_locked column from sessions table
-- This feature has been removed from the application

ALTER TABLE sessions DROP COLUMN IF EXISTS navigation_locked;
