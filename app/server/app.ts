import express, { Request, Response }  from "express";
import cors from 'cors';
import connectDB from './helper/score-sheet-db.ts'; 
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import scoreRoutes from './api-routes/index.ts';
import gameRoutes from './api-routes/games.ts';
import groupsRouter from './api-routes/groups.ts';

/* Server Entry Point (app.ts)
* This is the main entry point for the Express backend server.
* Key Responsibilities:
* Database Connection
* Middleware Configuration: Sets up basic utilities like JSON body parsing and CORS.
* Applies Clerk's session middleware (ClerkExpressWithAuth()) to reading the user's session
* and injecting the authentication context (req.auth) for protected routes.
* Routes API calls to their respective dedicated routers.
*/

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
const allowedOrigins = [
  'http://localhost:3000',
  'https://69f38105c0ec.ngrok-free.app',
];

const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
};


//middleware
app.use(cors(corsOptions));
app.use(express.json());
// app.use(ClerkExpressWithAuth()); 

//API route
app.use('/api/games', gameRoutes);
app.use('/api/scores',ClerkExpressWithAuth(), scoreRoutes);
app.use('/api/groups',ClerkExpressWithAuth(), groupsRouter);


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