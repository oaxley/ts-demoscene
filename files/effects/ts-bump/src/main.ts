/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the Bump Mapping effect
 */

//----- imports
import { runEffect } from "library/core/bootstrap";
import { Bump } from "./bump";

//----- begin
runEffect(Bump);
