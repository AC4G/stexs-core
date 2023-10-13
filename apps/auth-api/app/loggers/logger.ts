import { Logger } from "winston";
import { ENV } from "../../env-config";
import { devLogger } from "./devLogger";
import { prodLogger } from "./prodLogger";

let logger: Logger;

ENV === "prod" ? (logger = prodLogger) : (logger = devLogger);

export default logger;
