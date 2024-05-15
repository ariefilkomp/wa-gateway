const { Router } = require("express");
const {
  dashboard
} = require("../controllers/dashboard_controller");
const DashboardRouter = Router();

DashboardRouter.get("/dashboard", dashboard);

module.exports = DashboardRouter;
