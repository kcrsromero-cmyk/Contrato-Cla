-- Limpiar valores existentes que apuntan a suppliers (ya no válidos)
UPDATE contracts SET supplier_id = NULL WHERE supplier_id IS NOT NULL;

-- Eliminar FK y índice viejos que apuntan a suppliers
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_supplier_id_fkey;
DROP INDEX IF EXISTS contracts_supplier_id_idx;

-- Recrear FK apuntando a persons
ALTER TABLE contracts
  ADD CONSTRAINT contracts_supplier_id_fkey
  FOREIGN KEY (supplier_id) REFERENCES persons(id);

-- Recrear índice
CREATE INDEX contracts_supplier_id_idx ON contracts(supplier_id);
