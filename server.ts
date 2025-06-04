import * as dotenv from 'dotenv';
import app from './api/index.js';

// Load environment variables for local development
dotenv.config();

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
