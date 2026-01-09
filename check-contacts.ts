import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'verte',
});

async function main() {
  await ds.initialize();

  // Get user 941's active number
  const number = await ds.query(`
    SELECT id, cel, instance, status, status_connection
    FROM numbers
    WHERE user_id = 941 AND status = 1
  `);
  console.log('\n=== Número ativo do usuário 941 ===');
  console.table(number);

  // Count contacts by number_id for user 941
  const contactsByNumber = await ds.query(`
    SELECT number_id, status, COUNT(*) as total
    FROM contacts
    WHERE user_id = 941 AND deleted_at IS NULL
    GROUP BY number_id, status
    ORDER BY number_id, status
  `);
  console.log('\n=== Contatos por number_id e status ===');
  console.table(contactsByNumber);

  // Check if there are contacts with NULL number_id
  const nullNumberId = await ds.query(`
    SELECT COUNT(*) as total
    FROM contacts
    WHERE user_id = 941 AND deleted_at IS NULL AND number_id IS NULL
  `);
  console.log('\n=== Contatos com number_id NULL ===');
  console.table(nullNumberId);

  await ds.destroy();
}

main().catch(console.error);
