/*
  # Expand Contracts Schema

  1. New Columns in contracts table:
    - `category` (Serviço, Produto, Locação)
    - `cost_center` (Centro de Custo)
    - `payment_method` (Boleto, Transferência)
    - `adjustment_index` (IPCA, IGPM, INPC, Outro)
    - `adjustment_base_date` (Data base para reajuste)
    - `auto_renewal` (Renovação automática)
    - `fine_amount` (Valor da multa)
    - `has_guarantee` (Tem garantia)
    - `manager_id` (Gestor responsável)
    - `original_proposal_value` (Valor da proposta original para cálculo de saving)

  2. Index improvements for new query patterns
*/

DO $$
BEGIN
  -- Add category column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'category'
  ) THEN
    ALTER TABLE contracts ADD COLUMN category text CHECK (category IN ('Serviço', 'Produto', 'Locação'));
  END IF;

  -- Add cost_center column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'cost_center'
  ) THEN
    ALTER TABLE contracts ADD COLUMN cost_center text;
  END IF;

  -- Add payment_method column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE contracts ADD COLUMN payment_method text CHECK (payment_method IN ('Boleto', 'Transferência'));
  END IF;

  -- Add adjustment_index column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'adjustment_index'
  ) THEN
    ALTER TABLE contracts ADD COLUMN adjustment_index text CHECK (adjustment_index IN ('IPCA', 'IGPM', 'INPC', 'Outro'));
  END IF;

  -- Add adjustment_base_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'adjustment_base_date'
  ) THEN
    ALTER TABLE contracts ADD COLUMN adjustment_base_date text;
  END IF;

  -- Add auto_renewal column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'auto_renewal'
  ) THEN
    ALTER TABLE contracts ADD COLUMN auto_renewal boolean DEFAULT false;
  END IF;

  -- Add fine_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'fine_amount'
  ) THEN
    ALTER TABLE contracts ADD COLUMN fine_amount numeric DEFAULT 0;
  END IF;

  -- Add has_guarantee column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'has_guarantee'
  ) THEN
    ALTER TABLE contracts ADD COLUMN has_guarantee boolean DEFAULT false;
  END IF;

  -- Add manager_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE contracts ADD COLUMN manager_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Add original_proposal_value column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'original_proposal_value'
  ) THEN
    ALTER TABLE contracts ADD COLUMN original_proposal_value numeric;
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_contracts_category ON contracts(category);
CREATE INDEX IF NOT EXISTS idx_contracts_payment_method ON contracts(payment_method);
CREATE INDEX IF NOT EXISTS idx_contracts_manager ON contracts(manager_id);
CREATE INDEX IF NOT EXISTS idx_contracts_cost_center ON contracts(cost_center);