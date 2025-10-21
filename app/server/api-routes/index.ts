import express, { Router } from "express";
import myRecordsRouter from "./records.ts";

/*
 * Main API Router - acts as the primary hub for mounting all sub-routers in the application.
 * It directs traffic from the base API path to specific feature routes (e.g., /records).
 */

const router = express.Router();

//mount routers
router.use("/records", myRecordsRouter);

export default router;
