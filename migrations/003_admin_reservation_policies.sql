-- =============================================
-- Policies admin pour les réservations
-- Permet à l'admin de voir, créer et modifier toutes les réservations
-- =============================================

-- Beach reservations: admin can read all
CREATE POLICY "Admins can view all beach reservations"
  ON beach_reservations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Beach reservations: admin can insert (for booking on behalf of friends)
CREATE POLICY "Admins can create beach reservations"
  ON beach_reservations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Beach reservations: admin can update any (check-in, cancel, etc.)
CREATE POLICY "Admins can update all beach reservations"
  ON beach_reservations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Restaurant reservations: admin can read all
CREATE POLICY "Admins can view all restaurant reservations"
  ON restaurant_reservations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Restaurant reservations: admin can insert
CREATE POLICY "Admins can create restaurant reservations"
  ON restaurant_reservations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Restaurant reservations: admin can update any
CREATE POLICY "Admins can update all restaurant reservations"
  ON restaurant_reservations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Event tickets: admin can read all
CREATE POLICY "Admins can view all event tickets"
  ON event_tickets FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Event tickets: admin can update any
CREATE POLICY "Admins can update all event tickets"
  ON event_tickets FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
