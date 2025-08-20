import express, { Router } from "express";
import myRecordsRouter from "./records.ts";

const router = express.Router();

//mount routers
router.use("/records", myRecordsRouter);

export default router;
