// Drape - a fabric simulation software
// Built using three.js starting from the simple cloth simulation
// http://threejs.org/examples/#webgl_animation_cloth

var guiEnabled = true;

var structuralSprings = true;
var shearSprings = false;
var bendingSprings = true;

var DAMPING = 0.2;
var DRAG = 1 - DAMPING;
var MASS = .1;

var restDistanceB = 2;
var restDistanceS = Math.sqrt(2);

var friction = 0.9; // similar to coefficient of friction. 0 = frictionless, 1 = cloth sticks in place

var xSegs = 30; // how many particles wide is the cloth
var ySegs = 30; // how many particles tall is the cloth

var fabricLength = 400; // sets the size of the cloth
var restDistance; // = fabricLength/xSegs;

//var newCollisionDetection = true;

var wind = true;
var windStrength;
var windForce = new THREE.Vector3( 0, 0, 0 );

var rotate = false;
var pinned = 'Random';
var thing = 'None';

var cornersPinned, oneEdgePinned, twoEdgesPinned, fourEdgesPinned, randomEdgesPinned;

var avoidClothSelfIntersection = false;

if(guiEnabled){

  // GUI controls
  //sliders

  guiControls = new function(){
    this.friction = friction;
    this.particles = xSegs;
    this.rotate = rotate;

    this.wind = wind;
    this.thing = thing;
    this.pinned = pinned;

    this.avoidClothSelfIntersection = avoidClothSelfIntersection;

    this.fabricLength = fabricLength;
    this.structuralSprings = structuralSprings;

    this.bendingSprings = bendingSprings;
    this.bendingSpringLengthMultiplier = restDistanceB;

    this.shearSprings = shearSprings;
    this.shearSpringLengthMultiplier = restDistanceS;

    this.clothColor = 0x0035f3;
    this.clothSpecular = 0x030303;

    this.groundColor = 0x404761;
    this.groundSpecular = 0x404761;

    this.fogColor = 0xcce0ff;

  };
/*
  gui = new dat.GUI();

  var f0 = gui.add(guiControls, 'fabricLength', 200, 1000).step(20).name('Size').onChange(function(value){fabricLength = value; xSegs = Math.round(value/20); ySegs = Math.round(value/20); restartCloth();});

  var f4 = gui.addFolder('Interaction')

  f4.add(guiControls, 'rotate').name('auto rotate').onChange(function(value){rotate = value;});
  f4.add(guiControls, 'wind').name('wind').onChange(function(value){wind = value;});
  f4.add(guiControls, 'thing', ['None', 'Ball', 'Table']).name('object[0]').onChange(function(value){createThing(value);});
  f4.add(guiControls, 'pinned', ['None','Corners', 'OneEdge', 'TwoEdges','FourEdges']).name('pinned').onChange(function(value){pinCloth(value);});

  var f1 = gui.addFolder('Behavior');

  f1.add(guiControls, 'structuralSprings').name('cross grain').onChange(function(value){structuralSprings = value; restartCloth();});
  f1.add(guiControls, 'shearSprings').name('bias grain').onChange(function(value){shearSprings = value; restartCloth();});
  f1.add(guiControls, 'bendingSprings').name('drape').onChange(function(value){bendingSprings = value; restartCloth();});
  f1.add(guiControls, 'friction', 0, 1).onChange(function(value){friction = value;});
  f1.add(guiControls, 'avoidClothSelfIntersection').name('NoSelfIntersect').onChange(function(value){avoidClothSelfIntersection = value;});
  //f1.add(guiControls, 'weight', 0, 500).step(1).onChange(function(value){weight = value; restartCloth();});

  var f3 = gui.addFolder('Appearance');
  f3.addColor(guiControls, 'clothColor').name('cloth color').onChange(function(value){clothMaterial[0].color.setHex(value);});
  f3.addColor(guiControls, 'clothSpecular').name('cloth reflection').onChange(function(value){clothMaterial[0].specular.setHex(value);});
  f3.addColor(guiControls, 'groundColor').name('ground color').onChange(function(value){groundMaterial.color.setHex(value);});
  f3.addColor(guiControls, 'groundSpecular').name('gnd reflection').onChange(function(value){groundMaterial.specular.setHex(value);});
  f3.addColor(guiControls, 'fogColor').onChange(function(value){scene.fog.color.setHex(value); renderer.setClearColor(scene.fog.color);});
*/
}


var clothInitialPosition = [];
var cloth = [];

//var GRAVITY = 9.81 * 140; //
var GRAVITY = 9.81 * 0; // no gravity!
var gravity = new THREE.Vector3( 0, - GRAVITY, 0 ).multiplyScalar( MASS );


var TIMESTEP = 18 / 1000;
var TIMESTEP_SQ = TIMESTEP * TIMESTEP;

//var pins = [];


var tmpForce = new THREE.Vector3( 0, 0, 0);

var lastTime;

var pos;

// var ray = new THREE.Raycaster();
// var collisionResults, newCollisionResults;
var whereAmI, whereWasI;
// var directionOfMotion, distanceTraveled;

var posFriction = new THREE.Vector3( 0, 0, 0 );
var posNoFriction = new THREE.Vector3( 0, 0, 0 );

var diff = new THREE.Vector3();
var objectCenter = new THREE.Vector3();

var a,b,c,d,e,f;

var nearestX, nearestY, nearestZ;
var currentX, currentY, currentZ;
var xDist, yDist, zDist;
var randomPoints = [];
var rand, randX, randY;

function makeCloths()
{
  var w = 0;
  for (w = 0; w < numCloths; w++)
  {
    clothInitialPosition[w] = plane(500,500);
    cloth[w] = new Cloth( xSegs, ySegs, fabricLength, w );
  }
}


function pinCloth(choice){
  if(choice == 'Corners')
  {
    cornersPinned = true;
    oneEdgePinned = false;
    twoEdgesPinned = false;
    fourEdgesPinned = false;
    randomEdgesPinned = false;
  }
  else if(choice == 'OneEdge')
  {
    cornersPinned = false;
    oneEdgePinned = true;
    twoEdgesPinned = false;
    fourEdgesPinned = false;
    randomEdgesPinned = false;
  }
  else if(choice == 'TwoEdges')
  {
    cornersPinned = false;
    oneEdgePinned = false;
    twoEdgesPinned = true;
    fourEdgesPinned = false;
    randomEdgesPinned = false;
  }
  else if(choice == 'FourEdges')
  {
    cornersPinned = false;
    oneEdgePinned = false;
    twoEdgesPinned = false;
    fourEdgesPinned = true;
    randomEdgesPinned = false;
  }
  else if(choice == 'Random')
  {
    cornersPinned = false;
    oneEdgePinned = false;
    twoEdgesPinned = false;
    fourEdgesPinned = false;
    randomEdgesPinned = true;

    rand = Math.round(Math.random()*10)+1;
    randomPoints = [];
    for (u=0;u<rand;u++){
      randX = Math.round(Math.random()*xSegs);
      randY = Math.round(Math.random()*ySegs);
      randomPoints.push([randX,randY]);
    }
  }
  else if(choice == 'None')
  {
    cornersPinned = false;
    oneEdgePinned = false;
    twoEdgesPinned = false;
    fourEdgesPinned = false;
    randomEdgesPinned = false;
  }
}

function createThing(thing){


}


function wireFrame(){

  var w = 0;
  for (w = 0; w < numCloths; w++)
  {
    clothMaterial[w].wireframe = !clothMaterial[w].wireframe;
  }

}

function plane( width, height ) {

  return function( u, v ) {

    var x = Math.round((Math.random() - .5)*350);
    //var x = u * width - width/2;
    var y = Math.round((Math.random() - .5)*350); //height/2;
    var z = Math.round((Math.random() - .5)*350);
    //var z = v * height - height/2;
    //console.log("here");
    return new THREE.Vector3( x, y, z );
    //console.log("nowhere");
  };

}

function Particle( x, y, z, mass, whichCloth) {

  this.position = clothInitialPosition[whichCloth]( x, y ); // position
  this.previous = clothInitialPosition[whichCloth]( x, y ); // previous
  this.original = clothInitialPosition[whichCloth]( x, y ); // original
  this.a = new THREE.Vector3( 0, 0, 0 ); // acceleration
  this.mass = mass;
  this.invMass = 1 / mass;
  this.tmp = new THREE.Vector3();
  this.tmp2 = new THREE.Vector3();

}

Particle.prototype.lockToOriginal = function() {

    this.position.copy( this.original );
    this.previous.copy( this.original );
}

Particle.prototype.lock = function() {

    this.position.copy( this.previous );
    this.previous.copy( this.previous );

}


// Force -> Acceleration
Particle.prototype.addForce = function( force ) {

  this.a.add(
    this.tmp2.copy( force ).multiplyScalar( this.invMass )
  );

};


// Performs verlet integration
Particle.prototype.integrate = function( timesq ) {

  var newPos = this.tmp.subVectors( this.position, this.previous );
  newPos.multiplyScalar( DRAG ).add( this.position );
  newPos.add( this.a.multiplyScalar( timesq ) );

  this.tmp = this.previous;
  this.previous = this.position;
  this.position = newPos;

  this.a.set( 0, 0, 0 );

};



function satisifyConstrains( p1, p2, distance) {

  diff.subVectors( p2.position, p1.position );
  var currentDist = diff.length();
  if ( currentDist == 0 ) return; // prevents division by 0
  var correction = diff.multiplyScalar( (currentDist - distance) / currentDist);
  var correctionHalf = correction.multiplyScalar( 0.5 );
  p1.position.add( correctionHalf );
  p2.position.sub( correctionHalf );

}

function repelParticles( p1, p2, distance) {

  diff.subVectors( p2.position, p1.position );
  var currentDist = diff.length();
  if ( currentDist == 0 ) return; // prevents division by 0
  if (currentDist < distance){
    var correction = diff.multiplyScalar( (currentDist - distance) / currentDist);
    var correctionHalf = correction.multiplyScalar( 0.5 );
    p1.position.add( correctionHalf );
    p2.position.sub( correctionHalf );
  }

}


function Cloth( w, h, l, whichCloth ) {

  //w = w || 10;
  //h = h || 10;
  this.w = w;
  this.h = h;
  restDistance = l/w; // assuming square cloth for now

  var m = 0;

  var particles = [];
  var constrains = [];

  var u, v;


  // Create particles
  for (v=0; v<=h; v++) {
    for (u=0; u<=w; u++) {
      particles.push(
        new Particle(u/w, v/h, 0, MASS, whichCloth)
      );
    }
  }

    for (v=0; v<=h; v++) {
      for (u=0; u<=w; u++) {

        if(v<h && (u == 0 || u == w)){
          constrains.push( [
            particles[ index( u, v ) ],
            particles[ index( u, v + 1 ) ],
            restDistance
          ] );
        }

        if(u<w && (v == 0 || v == h)){
          constrains.push( [
            particles[ index( u, v ) ],
            particles[ index( u + 1, v ) ],
            restDistance
          ] );
        }
      }
    }


  // Structural

  if(structuralSprings){

    for (v=0; v<h; v++) {
      for (u=0; u<w; u++) {

        if(u!=0){
          constrains.push( [
            particles[ index( u, v ) ],
            particles[ index( u, v+1 ) ],
            restDistance
          ] );
        }

        if(v!=0){
          constrains.push( [
            particles[ index( u, v ) ],
            particles[ index( u+1, v ) ],
            restDistance
          ] );
        }

      }
    }
  }

  // Shear

  if(shearSprings){

   for (v=0;v<=h;v++)
   {
    for (u=0;u<=w;u++)
    {

      if(v<h && u<w){
        constrains.push([
          particles[index(u, v)],
          particles[index(u+1, v+1)],
          restDistanceS*restDistance
        ]);

        constrains.push([
          particles[index(u+1, v)],
          particles[index(u, v+1)],
          restDistanceS*restDistance
        ]);
      }

    }
   }
  }



// Bending springs

  if(bendingSprings){

    for (v=0; v<h; v++)
    {

      for (u=0; u<w; u++)
      {

        if(v<h-1){
          constrains.push( [
            particles[ index( u, v ) ],
            particles[ index( u, v+2 ) ],
            restDistanceB*restDistance
          ] );
        }

        if(u<w-1){
          constrains.push( [
            particles[ index( u, v ) ],
            particles[ index( u+2, v ) ],
            restDistanceB*restDistance
          ] );
        }


      }
    }
  }




  this.particles = particles;
  this.constrains = constrains;

  function index( u, v ) {

    return u + v * ( w + 1 );

  }

  this.index = index;

}

function map(n, start1, stop1, start2, stop2) {
  return ((n-start1)/(stop1-start1))*(stop2-start2)+start2;
}

function simulate( time ) {

  if ( ! lastTime ) {

    lastTime = time;
    return;

  }

  var i, il, particle, particles, pt, constrains, constrain;
  var w = 0;
  

  // Aerodynamics forces
  if ( wind )
  {

    windStrength = Math.cos( time / 7000 ) * 20 + 40;
    windForce.set(
      Math.sin( time / 2000 ),
      Math.cos( time / 3000 ),
      Math.sin( time / 1000 )
      ).normalize().multiplyScalar( windStrength);


    for (w = 0; w < numCloths; w++)
    {
      
      // apply the wind force to the cloth particles
      var face, faces = clothGeometry[w].faces, normal;
      particles = cloth[w].particles;
      for ( i = 0, il = faces.length; i < il; i ++ ) {
        face = faces[ i ];
        normal = face.normal;
        tmpForce.copy( normal ).normalize().multiplyScalar( normal.dot( windForce ) );
        particles[ face.a ].addForce( tmpForce );
        particles[ face.b ].addForce( tmpForce );
        particles[ face.c ].addForce( tmpForce );
      }
    }
    
  }

  for (w = 0; w < numCloths; w++)
  {
    
    for ( particles = cloth[w].particles, i = 0, il = particles.length ; i < il; i ++ )
    {
      particle = particles[ i ];
      particle.addForce( gravity );
      particle.integrate( TIMESTEP_SQ ); // performs verlet integration
    }

    // Start Constrains

    constrains = cloth[w].constrains,
    il = constrains.length;
    for ( i = 0; i < il; i ++ ) {
      constrain = constrains[ i ];
      satisifyConstrains( constrain[ 0 ], constrain[ 1 ], constrain[ 2 ], constrain[ 3] );
    }
    
    if(avoidClothSelfIntersection){
      for ( i = 0; i < particles.length; i ++ ){
        p_i = particles[i];
        for ( j = 0; j < particles.length; j ++ ){
          p_j = particles[j];
          repelParticles(p_i,p_j,restDistance);
        }
      }
    }
  
    //do I need this without table or ball?
    for ( particles = cloth[w].particles, i = 0, il = particles.length; i < il; i ++ )
    {
  
      particle = particles[ i ];
      whereAmI = particle.position;
      whereWasI = particle.previous;
    }
  
    // Floor Constrains
    for ( particles = cloth[w].particles, i = 0, il = particles.length
        ; i < il; i ++ )
    {
      particle = particles[ i ];
      pos = particle.position;
      if ( pos.y < - 249 ) {pos.y = - 249;}
    }
  
    // Pin Constrains
    if(cornersPinned){
      // could also do particles[blah].lock() which will lock particles to wherever they are, not to their original position
      particles[cloth[w].index(0,0)].lockToOriginal();
      particles[cloth[w].index(xSegs,0)].lockToOriginal();
      particles[cloth[w].index(0,ySegs)].lockToOriginal();
      particles[cloth[w].index(xSegs,ySegs)].lockToOriginal();
    }
  
    else if(oneEdgePinned){
     for (u=0;u<=xSegs;u++)
     {
      particles[cloth[w].index(u,0)].lockToOriginal();
     }
    }
  
    else if(twoEdgesPinned){
     for (u=0;u<=xSegs;u++)
     {
      particles[cloth[w].index(0,u)].lockToOriginal();
      particles[cloth[w].index(xSegs,u)].lockToOriginal();
     }
    }
  
    else if(fourEdgesPinned){
     for (u=0;u<=xSegs;u++)
     {
      particles[cloth[w].index(0,u)].lockToOriginal();
      particles[cloth[w].index(xSegs,u)].lockToOriginal();
      particles[cloth[w].index(u,0)].lockToOriginal();
      particles[cloth[w].index(u,xSegs)].lockToOriginal();
     }
    }
  
    else if(randomEdgesPinned)
    {
     for (u=0;u<randomPoints.length;u++){
      rand = randomPoints[u];
      randX = rand[0];
      randY = rand[1];
      particles[cloth[w].index(randX,randY)].lockToOriginal();
     }
    }
  }
}
