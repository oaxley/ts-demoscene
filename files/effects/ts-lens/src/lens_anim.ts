/*
 * @file    lens_anim.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Lens Animation Class
 */

//----- class
export class LensAnimation {

    //----- members
    private context_ : CanvasRenderingContext2D;
    private transMap_: number[];                    // deformation map
    private zoom_    : number;                      // lens magnification
    private radius_  : number;                      // lens radius
    private diameter_: number;                      // lens diameter


    //----- methods
    constructor(ctx: CanvasRenderingContext2D, radius: number, zoom: number) {
        // set the vars
        this.context_ = ctx;
        this.radius_  = radius;
        this.diameter_= radius * 2;
        this.zoom_    = zoom;

        // compute the transformation map
        this.transMap();
    }

    // transformation map
    private transMap(): void {
        // temporary vars
        let d = this.diameter_;
        let r = this.radius_;
        let r2 = r * r;
        let s  = Math.sqrt( r2 - this.zoom_*this.zoom_ );
        let s2 = s * s;

        // compute the map
        this.transMap_ = []
        for(let y = -r; y < r; y++) {
            let y2 = y * y;

            for(let x = -r; x < r; x++) {
                let x2 = x*x;
                let a = x;
                let b = y;

                // point inside the circle gets magnified
                if( (x2 + y2 ) < s2) {
                    let z = Math.sqrt(r2 - x2 - y2);
                    a = Math.floor( (x * this.zoom_) / (z + 0.5) );
                    b = Math.floor( (y * this.zoom_) / (z + 0.5) );
                }

                // transformation map
                this.transMap_[(y+r)*d + (x+r)] = (b+r)*d + (a+r);
            }
        }
    }
}