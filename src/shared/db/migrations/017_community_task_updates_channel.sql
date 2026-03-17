-- 017: Add task-updates channel for auto-generated task completion posts
INSERT IGNORE INTO `community_channels` (`id`, `name`, `display_name`, `description`, `is_system`)
VALUES (UUID(), 'task-updates', 'Task Updates', 'Automatic posts when tasks are completed', 1);
