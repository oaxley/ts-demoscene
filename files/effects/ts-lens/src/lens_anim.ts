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

    // compute the lens effect at a certain position
    public compute(xc: number, yc: number): void {
        // temporary vars
        let d = this.diameter_;

        // retrieve the upper corner of the lens
        let xl = xc - this.radius_;
        let yl = yc - this.radius_;

        // retrieve the current image data
        let src_data: ImageData = this.context_.getImageData(xl, yl, d, d);

        // destination image
        let dst_data: ImageData = new ImageData(d, d);

        // got through all the pixels in the source data
        for(let y = 0; y < d; y++) {
            let offset = y * d;

            for(let x = 0; x < d; x++) {

                // retrieve the corresponding offset from the transformation map
                let t_offset = this.transMap_[offset];

                // copy the pixels accordingly
                dst_data.data[(offset << 2) + 0] = src_data.data[(t_offset << 2) + 0];
                dst_data.data[(offset << 2) + 1] = src_data.data[(t_offset << 2) + 1];
                dst_data.data[(offset << 2) + 2] = src_data.data[(t_offset << 2) + 2];
                dst_data.data[(offset << 2) + 3] = src_data.data[(t_offset << 2) + 3];

                // next pixel
                offset++;
            }
        }

        // apply the transformation
        this.context_.putImageData(dst_data, xl, yl);

        // create the bubble effect using the canvas drawing tools
        // need to be changed to something more "oldkool"
        this.context_.beginPath()
        this.context_.arc(xc, yc, this.radius_, 0, 2*Math.PI);
        this.context_.strokeStyle = "rgba(128,128,196,0.5)";
        this.context_.fillStyle = "rgba(0,0,196,0.1)";
        this.context_.fill();
        this.context_.lineWidth = 2;
        this.context_.stroke();

        let r = this.radius_ - (this.radius_ / 4);
        this.context_.beginPath()
        this.context_.arc(xc, yc, r, 1.7453, 3.536);
        this.context_.strokeStyle = "rgba(0,0,144,0.2)";
        this.context_.lineWidth = 5;
        this.context_.stroke();
    }
}