-- Aktivera Supabase Realtime för tabeller som behöver live-sync
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_list;
