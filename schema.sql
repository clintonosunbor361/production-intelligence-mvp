-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Roles & Access Control (RBAC)
-- Since we are using Supabase Auth, roles are managed in a separate table linked to auth.users
-- For this MVP, we define the enum logic here.

CREATE TYPE user_role AS ENUM ('admin', 'production', 'qc', 'accounts', 'completion');

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role user_role NOT NULL DEFAULT 'production',
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Master Data

CREATE TABLE product_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_type_id UUID NOT NULL REFERENCES product_types(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_type_id, category_id, name)
);

CREATE TABLE rate_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_type_id UUID NOT NULL REFERENCES product_types(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  task_type_id UUID NOT NULL REFERENCES task_types(id),
  base_fee DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_type_id, category_id, task_type_id)
);

CREATE TABLE tailors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  percentage DECIMAL(5, 4) NOT NULL, -- Stored as decimal (e.g. 0.30 for 30%)
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Operational Data

CREATE TYPE item_status AS ENUM ('New', 'Hold', 'Cancelled', 'Received');

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  product_type_id UUID NOT NULL REFERENCES product_types(id),
  assigned_date TIMESTAMPTZ DEFAULT NOW(),
  item_no INTEGER NOT NULL, -- Auto-generated via trigger
  item_key TEXT UNIQUE NOT NULL, -- Computed via trigger
  status item_status DEFAULT 'New',
  received_date TIMESTAMPTZ,
  needs_qc_attention BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_by_role TEXT, -- Audit field
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE verification_status AS ENUM ('Pending', 'Verified', 'Rejected');

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  task_type_id UUID NOT NULL REFERENCES task_types(id),
  tailor_id UUID NOT NULL REFERENCES tailors(id),
  
  -- Snapshots
  tailor_percentage_snapshot DECIMAL(5, 4) NOT NULL,
  base_fee_snapshot DECIMAL(10, 2) NOT NULL,
  tailor_pay DECIMAL(10, 2) GENERATED ALWAYS AS (base_fee_snapshot * tailor_percentage_snapshot) STORED,
  
  -- Verification
  verification_status verification_status DEFAULT 'Pending',
  verified_by_role TEXT,
  verified_at TIMESTAMPTZ,
  reject_reason TEXT,
  
  created_by_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Triggers & Functions

-- Function to generate item_no and item_key
CREATE OR REPLACE FUNCTION generate_item_details()
RETURNS TRIGGER AS $$
DECLARE
  max_no INTEGER;
  prod_name TEXT;
BEGIN
  -- Get the current max item_no for this ticket+product
  SELECT COALESCE(MAX(item_no), 0) INTO max_no
  FROM items
  WHERE ticket_id = NEW.ticket_id AND product_type_id = NEW.product_type_id;
  
  NEW.item_no := max_no + 1;
  
  -- Get product name for key generation
  SELECT name INTO prod_name FROM product_types WHERE id = NEW.product_type_id;
  
  -- Generate key: TICKET-PRODUCT-NO
  NEW.item_key := NEW.ticket_id || '-' || prod_name || '-' || NEW.item_no;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_item_details
BEFORE INSERT ON items
FOR EACH ROW
EXECUTE FUNCTION generate_item_details();

-- Function to auto-set received_date
CREATE OR REPLACE FUNCTION update_received_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Received' AND OLD.status != 'Received' THEN
    NEW.received_date := NOW();
    
    -- Check if QC attention is needed (0 tasks)
    IF (SELECT COUNT(*) FROM tasks WHERE item_id = NEW.id) = 0 THEN
      NEW.needs_qc_attention := TRUE;
    ELSE
      NEW.needs_qc_attention := FALSE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_received_date
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION update_received_date();
