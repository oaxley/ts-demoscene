/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Torus Mirror effect
 */

//----- imports
import { runEffect } from "library/core/bootstrap";
import { Mirror } from "./mirror";

//----- begin
runEffect(Mirror);
