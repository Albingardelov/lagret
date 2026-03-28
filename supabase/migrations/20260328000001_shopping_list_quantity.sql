-- Already applied via SQL editor
ALTER TABLE shopping_list ADD COLUMN quantity numeric NOT NULL DEFAULT 1;
ALTER TABLE shopping_list ADD COLUMN unit text NOT NULL DEFAULT 'st';
