/*
 * @file    main.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main entry point for the ImgNoise effect
 */

//----- imports
import { runEffect } from "library/core/bootstrap";
import { ImgNoise } from "./noise";


//----- begin
runEffect(ImgNoise);
