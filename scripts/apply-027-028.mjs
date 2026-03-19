import mysql from "mysql2/promise";

const DB_URL = "mysql://root:Admin123@13.78.81.86:18306/grc-server";

const conn = await mysql.createConnection(DB_URL);
console.log("Connected");

// 027 roadmap
try {
  await conn.execute(`CREATE TABLE IF NOT EXISTS roadmap_items (
    id CHAR(36) NOT NULL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    roadmap_phase ENUM('now','next','later','done') DEFAULT 'later',
    roadmap_priority ENUM('must','should','could','wont') DEFAULT 'should',
    category VARCHAR(50) NULL,
    start_date DATETIME NULL,
    end_date DATETIME NULL,
    progress INT DEFAULT 0,
    owner_id VARCHAR(100) NULL,
    owner_role VARCHAR(50) NULL,
    linked_task_ids TEXT NULL,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW()
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log("OK: roadmap_items table");
} catch (e) {
  console.log("WARN roadmap_items:", e.message);
}

try { await conn.execute("CREATE INDEX idx_roadmap_phase ON roadmap_items (roadmap_phase)"); console.log("OK: idx phase"); } catch (e) { console.log("WARN:", e.message.substring(0, 80)); }
try { await conn.execute("CREATE INDEX idx_roadmap_priority ON roadmap_items (roadmap_priority)"); console.log("OK: idx priority"); } catch (e) { console.log("WARN:", e.message.substring(0, 80)); }
try { await conn.execute("CREATE INDEX idx_roadmap_category ON roadmap_items (category)"); console.log("OK: idx category"); } catch (e) { console.log("WARN:", e.message.substring(0, 80)); }

// 028 kpis
try {
  await conn.execute(`CREATE TABLE IF NOT EXISTS kpi_definitions (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    category VARCHAR(50) NULL,
    unit VARCHAR(20) NULL,
    target_value DECIMAL(14,2) NULL,
    kpi_period ENUM('daily','weekly','monthly','quarterly','yearly') DEFAULT 'monthly',
    owner_role VARCHAR(50) NULL,
    created_at DATETIME DEFAULT NOW()
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log("OK: kpi_definitions table");
} catch (e) {
  console.log("WARN kpi_definitions:", e.message);
}

// kpi_records may already exist from earlier partial run
try {
  const [existing] = await conn.execute("SHOW TABLES LIKE 'kpi_records'");
  if (existing.length === 0) {
    await conn.execute(`CREATE TABLE kpi_records (
      id CHAR(36) NOT NULL PRIMARY KEY,
      kpi_id CHAR(36) NOT NULL,
      value DECIMAL(14,2) NOT NULL,
      recorded_at DATETIME DEFAULT NOW(),
      recorded_by VARCHAR(100) NULL,
      notes TEXT NULL,
      INDEX idx_kpi_records_kpi_id (kpi_id),
      INDEX idx_kpi_records_recorded_at (recorded_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log("OK: kpi_records table");
  } else {
    console.log("SKIP: kpi_records already exists");
  }
} catch (e) {
  console.log("WARN kpi_records:", e.message);
}

// Verify
const [tables] = await conn.execute("SHOW TABLES");
const relevant = tables.map((r) => Object.values(r)[0]).filter((t) => t.startsWith("roadmap") || t.startsWith("kpi"));
console.log("Relevant tables:", relevant);

await conn.end();
console.log("Done");
