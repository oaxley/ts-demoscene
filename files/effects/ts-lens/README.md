# *Elastic Lens*

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg?style=flat-square)

## **Screenshot**

![screenshot](../../images/screenshot/ts-lens.screenshot.png)


## **Algorithm**

The algorithm is based on the concept of Transformation Map. It's a pre-calculated table that contains how the source pixel 
should be modified to achieve the effect:

```
output_pixel = transformation[input_pixel]
```

The size of the transformation box is known at the beginning because we want to modify only a part of the initial image and 
not the whole.

Here are some simple transformations:

``` javascript
// no transformation at all
for (var i = 0; i < width*height; i++) {
  transformation[i] = i;
}
```

``` javascript
// flip on the X axis
for (var y = 0; y < height; y++) {
  for (var x = 0; x < width; x++) {
    transformation[y * width + x] = y * width + (width - x);
  }
}
```

For the lens effect, we need to consider every points that are inside the circle and apply a zoom factor proportional to its distance in the circle.

``` javascript
// x goes from -Radius to +Radius
// y goes from -Radius to +Radius
x2 = x * x
y2 = y * y

// point inside the circle gets magnified
if( (x2 + y2 ) < s2) {
    let z = Math.sqrt(r2 - x2 - y2);
    a = Math.floor( (x * this.zoom_) / (z + 0.5) );
    b = Math.floor( (y * this.zoom_) / (z + 0.5) );
}

// transformation map
this.transMap_[(y+r)*d + (x+r)] = (b+r)*d + (a+r);
```

## *Elastic collision*

The collision detection between the lenses is done via a broader and narrow detector.  
Each object has a bouding box that is used to determine if a broader collision has occured.  
If this is the case, then a narrow collision detection is performed to determine how the object should react.

The scene has 4 invisible walls around to ensure that the lenses get bounced back properly.  
As the wall have no speed, thus no kinetic energy, the integrality of the velocity is sent back to the lens.

## **License**

All the code are under the **Apache License 2.0**.  
A copy of the license is available [here](https://choosealicense.com/licenses/apache-2.0/).
