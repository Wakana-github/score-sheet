import express, { Request, Response }  from "express";
import cors from 'cors';
import connectDB from './helper/score-sheet-db.ts'; 
import { ClerkExpressRequireAuth, ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import scoreRoutes from './api-routes/index.ts';
import gameRoutes from './api-routes/games.ts';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

//onitor for unhandled exceptions 
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// CORS setting
const corsOptions = {
  // set domain
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  optionsSuccessStatus: 200,
};

//middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(ClerkExpressWithAuth()); 

//API route
app.use('/api/games', gameRoutes);
app.use('/api/scores', scoreRoutes);

//undefine route
app.use((req: Request, res: Response) => {
  res.status(404).send('404 Not Found');
});


// coneect to Database -- execute connect DB function
async function startServer() {
  try {
    await connectDB();
    console.log("Database connection with app successful.");

    app.listen(port, () => {
      console.log(`Server started on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
}

//start server
startServer();