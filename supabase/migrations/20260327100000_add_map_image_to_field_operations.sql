-- Add map image columns to field_operations for storing operation visualization images
ALTER TABLE field_operations ADD COLUMN map_image_path text;
ALTER TABLE field_operations ADD COLUMN map_image_extent jsonb;
ALTER TABLE field_operations ADD COLUMN map_image_legends jsonb;
ALTER TABLE field_operations ADD COLUMN measurement_type text;
