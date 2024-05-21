import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from "../controllers/subscription.controllers.js";

const router = Router();

router.use(verifyJWT);
// console.log("reached here");
router.route("/c/:channelId")
            .get(getUserChannelSubscribers)
            .post(toggleSubscription);

router.route("/u/:subscriberId").get(getSubscribedChannels);

export default router;