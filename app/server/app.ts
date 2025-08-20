import express from "express";
import cors from 'cors';
import connectDB from './helper/score-sheet-db.ts'; 
import { ClerkExpressRequireAuth, ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import scoreRoutes from './api-routes/index.ts';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

//middleware
app.use(cors());
app.use(express.json());
app.use(ClerkExpressWithAuth()); 

// coneect to Database -- execute connect DB function
connectDB();

//API route
app.use('/api/scores', scoreRoutes);

app.listen(port, function(){
    console.log(`Server start: http://localhost:${port}`);
});