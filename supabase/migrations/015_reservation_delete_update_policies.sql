-- Allow users to DELETE their own reservations (e.g. when payment fails)
CREATE POLICY "Users can delete own beach reservations"
  ON beach_reservations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own restaurant reservations"
  ON restaurant_reservations FOR DELETE
  USING (auth.uid() = user_id);

-- Allow users to UPDATE their own reservations (e.g. change status)
CREATE POLICY "Users can update own beach reservations"
  ON beach_reservations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own restaurant reservations"
  ON restaurant_reservations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
