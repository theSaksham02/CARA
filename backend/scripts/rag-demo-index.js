'use strict';

const path = require('node:path');

const dotenv = require('dotenv');

const { bootstrapDatabase } = require('../db/setup');
const { buildIndex, getRagStatus } = require('../services/ragService');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  await bootstrapDatabase();

  const patientIdArg = process.argv.find((arg) => arg.startsWith('--patient_id='));
  const patientId = patientIdArg ? patientIdArg.split('=')[1] : null;

  const result = await buildIndex({
    patient_id: patientId,
    persist: true,
  });

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        message: 'RAG index built successfully.',
        result,
        status: getRagStatus(),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to build RAG index:', error);
  process.exit(1);
});
