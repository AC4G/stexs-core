import { setupEmailConsumer } from "./emailConsumer";
import { shutdownController as controller } from "../shutdown";

export async function setupConsumers() {
    await setupEmailConsumer(controller);
}
