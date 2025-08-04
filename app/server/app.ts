import express from "express";
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './helper/score-sheet-db'; 
import scoreRoutes from './api-routes/index';
dotenv.config();


const app = express();
const port = process.env.PORT || 8080;

//middleware
app.use(cors());
app.use(express.json());

// coneect to Database -- execute connect DB function
connectDB();

//API route
app.use('/api/scores', scoreRoutes);

app.listen(port, function(){
    console.log(`Server start: http://localhost:${port}`);
});