
var lineMat = new THREE.LineBasicMaterial( {
  color: 0x000000,
  side: THREE.DoubleSide,
  linewidth: 1,
} );

///////////////////////////////

// make line shape
var holeShapes = [];
for ( var i = 0; i < fontShapes.length; i ++ ) {
  var shape = fontShapes[ i ];
  if ( shape.holes && shape.holes.length > 0 ) {
    for ( var j = 0; j < shape.holes.length; j ++ ) {
      var hole = shape.holes[ j ];
      holeShapes.push( hole );
    }
  }
}
fontShapes.push.apply( fontShapes, holeShapes );

var lineText = new THREE.Group();
for ( var i = 0; i < fontShapes.length; i ++ ) {
  var shape = fontShapes[ i ];

  var lineGeometry = shape.createPointsGeometry();
  lineGeometry.translate( xMid, yMid, 0 );
  lineGeometry.computeLineDistances();

  var lineMesh = new THREE.Line( lineGeometry, lineMat );
  lineText.add( lineMesh );
}

// scene.add( lineText );

///////////////////////////////

// make filled shape
// filledGeometry = new THREE.ShapeGeometry( fontShapes, 2 );
// filledGeometry.computeBoundingBox();

// var xMid = - 0.5 * ( filledGeometry.boundingBox.max.x - filledGeometry.boundingBox.min.x );
// var yMid = - 0.5 * ( filledGeometry.boundingBox.max.y - filledGeometry.boundingBox.min.y );

// filledGeometry.translate( xMid, yMid, 0 );

// filledGeometry.translate( 0, 0, camera.position.z - 300 );
// // filledGeometry.translate( 
// //   randomRange(-100, 100),
// //   0,
// //   0
// //   // randomRange(-100, 100),
// // );





///////////////////////////////


/////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

function createText() {

  let message = "vis";

  fontShapes = font.generateShapes( message, fontSize, fontDivisions );
  let fontPts = fontShapes.map(function(shape) {
    return shape.extractAllPoints(100);
  });
  // fontShapes: [v, i_stem, i_dot, s]

  ////////////////////////////////////////////////////
  
  let charPts = fontPts[0].shape;

  let fontTriIdxs = THREE.ShapeUtils.triangulateShape(charPts, []);

  // make character geom
  let charGeom = new THREE.Geometry();

  for (let i = 0; i < charPts.length; i++) {
    let pt = charPts[i];
    let vec = new THREE.Vector3( pt.x, pt.y, 0 );
    charGeom.vertices.push(vec);
  }

  let idx = 0;
  for (let i = 0; i < fontTriIdxs.length; i++) {
    let face = fontTriIdxs[i];

    let faceStartIdx = i * 3;
    charGeom.faces.push( new THREE.Face3( face[0], face[1], face[2] ) );
  }

  charGeom.verticesNeedUpdate = true;

  let textMesh = new THREE.Mesh( charGeom, flatMat );

  scene.add( textMesh );
  
  ////////////////////////////////////////////////////
  
  {
    let geometry = new THREE.PlaneGeometry( 2000, 2000 );
    let material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
    let plane = new THREE.Mesh( geometry, material );
    plane.translateY(-0.1);
    plane.rotateX( Math.PI * 0.5 );
    scene.add( plane );
  }

  ////////////////////////////////////////////////////

  let spotLight = new THREE.SpotLight( 0xffffff );
  spotLight.position.set( 100, 1000, 100 );

  spotLight.castShadow = true;

  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;

  spotLight.shadow.camera.near = 500;
  spotLight.shadow.camera.far = 4000;
  spotLight.shadow.camera.fov = 30;

  scene.add( spotLight );
  let lineMat = new THREE.LineBasicMaterial({
    color:0xff0000,
  });

  const numStemNodes = 100;
  const stemHeight = 500;
  const stemSegmentLength = stemHeight / (numStemNodes - 1);
  const ropeRadius = 10;
  const groundY = 0;

  let lineGeom = new THREE.Geometry();

  let lineNodes = [];

  let prevVert = new THREE.Vector3(0,0,0);
  for (let i = 0; i < numStemNodes; i++) {
    let alpha = i / (numStemNodes - 1);

    let theta = Math.random() * Math.PI * 2;
    let randRadius = randomGaussian(0, 1) * 1;
    
    let newVert = new THREE.Vector3(
      Math.cos(theta) * randRadius,// + prevVert.x, 
      alpha * stemHeight + groundY, 
      Math.sin(theta) * randRadius,// + prevVert.z
    );

    let geometry = new THREE.SphereGeometry(ropeRadius);
    // let material = new THREE.MeshBasicMaterial({
    let material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      // wireframe: true,
    });

    let ropeNodeSphereMesh = new THREE.Mesh(geometry, material);
    scene.add(ropeNodeSphereMesh);

    let newNode = {
      pos: newVert,
      prevPos: newVert.clone(),
      idxInRope: i,
      sphereMesh: ropeNodeSphereMesh,
    }

    lineGeom.vertices.push(newVert);
    lineNodes.push(newNode); 
    prevVert = newVert;
  };

  let lineMesh = new THREE.Line( lineGeom, lineMat );
  scene.add(lineMesh);

  ////////////////////////////////////////////////////


///////////////////////////////



///////////////////////////////



///////////////////////////////



///////////////////////////////



///////////////////////////////



///////////////////////////////


