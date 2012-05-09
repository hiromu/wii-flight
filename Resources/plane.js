//
//  plane.js
//  WiiFlight
//
//   Copyright 2006 Google Inc.
//   Modified for WiiFlight 2012 Hiromu Yakura.
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

window.truck = null;

// Pull the airplane model
var MODEL_URL = 'http://wii-flight.googlecode.com/git/Assets/hawk.kmz';

var STEER_ROLL = -1.0;
var ROLL_SPRING = 0.25;
var ROLL_DAMP = -0.16;

var mon_Latitude = 0.0;
var mon_Longitude = 0.0;
var mon_Height = 0.0;
var mon_AdjHeight = 0.0;

leftButtonDown = false;
rightButtonDown = false;
gasButtonDown = false;
reverseButtonDown = false;

function keyDown(event) {
	if (!event) {
		event = window.event;
	}
	if (event.keyCode == 37) {  // Left.
		leftButtonDown = true;
		event.returnValue = false;
	} else if (event.keyCode == 39) {  // Right.
		rightButtonDown = true;
		event.returnValue = false;
	} else if (event.keyCode == 38) {  // Up.
		gasButtonDown = true;
		event.returnValue = false;
	} else if (event.keyCode == 40) {  // Down.
		reverseButtonDown = true;
		event.returnValue = false;
	} else {
		return true;
	}
	return false;
}

function keyUp(event) {
	if (!event) {
		event = window.event;
	}
	if (event.keyCode == 37) {  // Left.
		leftButtonDown = false;
		event.returnValue = false;
	} else if (event.keyCode == 39) {  // Right.
		rightButtonDown = false;
		event.returnValue = false;
	} else if (event.keyCode == 38) {  // Up.
		gasButtonDown = false;
		event.returnValue = false;
	} else if (event.keyCode == 40) {  // Down.
		reverseButtonDown = false;
		event.returnValue = false;
	}
	return false;
}

function clamp(val, min, max) {
	if (val < min) {
		return min;
	} else if (val > max) {
		return max;
	}
	return val;
}

function fixAngle(a) {
	while (a < -180) {
		a += 360;
	}
	while (a > 180) {
		a -= 360;
	}
	return a;
}

function Plane() {
	var me = this;
		
	// We do all our motion relative to a local coordinate frame that is
	// anchored not too far from us.  In this frame, the x axis points
	// east, the y axis points north, and the z axis points straight up
	// towards the sky.
	//
	// We periodically change the anchor point of this frame and
	// recompute the local coordinates.
	me.localAnchorLla = [0, 0, 0];
	me.localAnchorCartesian = V3.latLonAltToCartesian(me.localAnchorLla);
	me.localFrame = M33.identity();
	
	// Position, in local cartesian coords.
	me.pos = [0, 0, 0];
	
	// Velocity, in local cartesian coords.
	me.vel = [0, 0, 0];
	
	// Orientation matrix, transforming model-relative coords into local
	// coords.
	me.modelFrame = M33.identity();
	
	me.lastAccel = false;
	me.lastReverse = false;
	me.accelSpeed = 1;
	me.reverseSpeed = 1;
	
	me.roll = 0;
	me.rollSpeed = 0;
	
	me.accelRoll = 0;
	me.accelRollSpeed = 0;
	
	me.idleTimer = 0;
	me.fastTimer = 0;
	me.popupTimer = 0;
	
	ge.getOptions().setFlyToSpeed(100);  // don't filter camera motion
	window.google.earth.fetchKml(ge, MODEL_URL, function(obj) { me.finishInit(obj); });
}

Plane.prototype.finishInit = function(kml) {
	var me = this;
	
	me.placemark = kml.getFeatures().getChildNodes().item(1);
	me.model = me.placemark.getGeometry();
	me.orientation = me.model.getOrientation();
	me.location = me.model.getLocation();
	
	me.model.setAltitudeMode(ge.ALTITUDE_ABSOLUTE);
	me.orientation.setHeading(90);
	me.model.setOrientation(me.orientation);
	
	ge.getFeatures().appendChild(me.placemark);
	
	me.teleportTo(34.718916, 135.268457);
	me.lastMillis = (new Date()).getTime();
	
	google.earth.addEventListener(ge, "frameend", function() { me.tick(); });
	me.cameraCut();	
	ge.getWindow().blur();
}

Plane.prototype.tick = function() {
	var tick = this.tick;
	this.tick = function() { return; };
	
	var me = this;
	var now = (new Date()).getTime();
	// dt is the delta-time since last tick, in seconds
	var dt = (now - me.lastMillis) / 1000.0;
	if (dt > 0.25) {
		dt = 0.25;
	}
	me.lastMillis = now;
	
	var c0 = 1;
	var c1 = 0;
	
	if (V3.length([me.pos[0], me.pos[1], 0]) > 100) {
		// Re-anchor our local coordinate frame whenever we've strayed a
		// bit away from it.  This is necessary because the earth is not
		// flat!
		me.adjustAnchor();
	}
	
	var gpos = V3.add(me.localAnchorCartesian, M33.transform(me.localFrame, me.pos));
	var lla = V3.cartesianToLatLonAlt(gpos);
	
	// Turn Calculation
	var steerAngle = 0;
	var absSpeed = V3.length(me.vel);
	if (leftButtonDown || rightButtonDown) {
		var TURN_SPEED_MIN = 40.0;  // radians/sec
		var TURN_SPEED_MAX = 60.0;  // radians/sec
		var SPEED_MAX_TURN = 200.0;
		var SPEED_MIN_TURN = 450.0;
		
		var turnSpeed;
		if (absSpeed < SPEED_MAX_TURN) {
			turnSpeed = TURN_SPEED_MIN + (TURN_SPEED_MAX - TURN_SPEED_MIN)
			* (SPEED_MAX_TURN - absSpeed) / SPEED_MAX_TURN;
			turnSpeed *= (absSpeed / SPEED_MAX_TURN);  // Less turn as truck slows
		} else {
			turnSpeed = TURN_SPEED_MAX;
		}
		if (leftButtonDown) {
			steerAngle = turnSpeed / 3 * dt * Math.PI / 180.0;
		}
		if (rightButtonDown) {
			steerAngle = -turnSpeed / 3 * dt * Math.PI / 180.0;
		}
	}
	
	// Turn
	var newdir = V3.rotate(me.modelFrame[1], me.modelFrame[2], steerAngle);
	me.modelFrame = M33.makeOrthonormalFrame(newdir, me.modelFrame[2]);
	var dir = me.modelFrame[1];
	var up = me.modelFrame[2];
		
	// Damp sideways slip.  Ad-hoc frictiony hack.
	//
	// I'm using a damped exponential filter here, like:
	// val = val * c0 + val_new * (1 - c0)
	//
	// For a variable time step:
	//  c0 = exp(-dt / TIME_CONSTANT)
	var right = me.modelFrame[0];
	var slip = V3.dot(me.vel, right);
	c0 = Math.exp(-dt / 0.5);
	me.vel = V3.sub(me.vel, V3.scale(right, slip * (1 - c0)));
	
	// Apply engine/reverse accelerations.
	var ACCEL = 80.0;
	var forwardSpeed = V3.dot(dir, me.vel);
	me.vel = V3.add(me.vel, V3.scale(dir, ACCEL * dt));

	// Height Calculation
	if (reverseButtonDown) {
		me.lastReverse = false;
		if (me.lastAccel) {
			me.accelSpeed += 0.1;
		} else {
			me.lastAccel = true;
		}
		mon_AdjHeight += me.accelSpeed;
	} else if (gasButtonDown) {
		me.lastAccel = false;
		if (me.lastReverse) {
			me.reverseSpeed += 0.1;
		} else {
			me.lastReverse = true;
		}
		mon_AdjHeight -= me.reverseSpeed;
	} else {
		me.lastAccel = false;
		me.lastReverse = false;
	}
	if (!me.lastAccel && me.accelSpeed > 1) {
		me.accelSpeed = Math.max(me.accelSpeed / 1.1, 1);
		mon_AdjHeight += me.accelSpeed;
	}
	if (!me.lastReverse && me.reverseSpeed > 1) {
		me.reverseSpeed = Math.max(me.reverseSpeed / 1.1, 1);
		mon_AdjHeight -= me.reverseSpeed;
	}
	mon_AdjHeight = Math.max(mon_AdjHeight, 0);
	
	// Air drag
	//
	// Fd = 1/2 * rho * v^2 * Cd * A.
	// rho ~= 1.2 (typical conditions)
	// Cd * A = 3 m^2 ("drag area")
	//
	// I'm simplifying to:
	//
	// accel due to drag = 1/Mass * Fd
	// with Milktruck mass ~= 2000 kg
	// so:
	// accel = 0.6 / 2000 * 3 * v^2
	// accel = 0.0009 * v^2
	absSpeed = V3.length(me.vel);
	if (absSpeed > 0.01) {
		var veldir = V3.normalize(me.vel);
		var DRAG_FACTOR = 0.00050;
		var drag = absSpeed * absSpeed * DRAG_FACTOR;
		
		// Some extra constant drag (rolling resistance etc) to make sure
		// we eventually come to a stop.
		var CONSTANT_DRAG = 2.0;
		drag += CONSTANT_DRAG;
		
		if (drag > absSpeed) {
			drag = absSpeed;
		}
		
		me.vel = V3.sub(me.vel, V3.scale(veldir, drag * dt));
	}
	
	// Gravity
	me.vel[2] -= 9.8 * dt;
	
	// Move
	var deltaPos = V3.scale(me.vel, dt);
	me.pos = V3.add(me.pos, deltaPos);
	
/*
	gpos = V3.add(me.localAnchorCartesian,  M33.transform(me.localFrame, me.pos));
	lla = V3.cartesianToLatLonAlt(gpos);
	
	// Cancel velocity into the ground.
	//
	// TODO: would be fun to add a springy suspension here so
	// the truck bobs & bounces a little.
	var normal = estimateGroundNormal(gpos, me.localFrame);
	var speedOutOfGround = V3.dot(normal, me.vel);
	if (speedOutOfGround < 0) {
		me.vel = V3.add(me.vel, V3.scale(normal, -speedOutOfGround));
	}
	
	// Make our orientation follow the ground.
	c0 = Math.exp(-dt / 0.25);
	c1 = 1 - c0;
	var blendedUp = V3.normalize(V3.add(V3.scale(up, c0), V3.scale(normal, c1)));
	me.modelFrame = M33.makeOrthonormalFrame(dir, blendedUp);
*/
	
	gpos = V3.add(me.localAnchorCartesian, M33.transform(me.localFrame, me.pos));
	lla = V3.cartesianToLatLonAlt(gpos);

	// Don't go underground.
	var groundAlt = ge.getGlobe().getGroundAltitude(lla[0], lla[1]);
	if (me.pos[2] < groundAlt) {
		me.pos[2] = groundAlt;
	}
	if(lla[2] < 0) {
		lla[2] = 0;
	}
	
	// Position Calculation
	mon_Latitude = lla[0];
	mon_Longitude = lla[1];
	mon_Height = lla[2] + 60 + mon_AdjHeight;
	me.model.getLocation().setLatLngAlt(mon_Latitude, mon_Longitude, mon_Height);
	
	// Compute roll
	var newhtr = M33.localOrientationMatrixToHeadingTiltRoll(me.modelFrame);
	
	var absRoll = newhtr[2];
	me.rollSpeed += steerAngle * forwardSpeed * 4 * STEER_ROLL;
	me.rollSpeed += (ROLL_SPRING * -me.roll + ROLL_DAMP * me.rollSpeed);
	me.roll += me.rollSpeed * dt;
	me.roll = clamp(me.roll, -85, 85);
	absRoll -= me.roll;
	
	var absAccelRoll = newhtr[1];
	me.accelRollSpeed += (me.reverseSpeed - me.accelSpeed) * 10 * STEER_ROLL;
	me.accelRollSpeed += (ROLL_SPRING * -me.accelRoll + ROLL_DAMP * me.accelRollSpeed);
	me.accelRoll += me.accelRollSpeed * dt;
	me.accelRoll = clamp(me.accelRoll, -15, 25);
	absAccelRoll -= me.accelRoll;
	
	me.orientation.set(newhtr[0], absAccelRoll, absRoll);
	me.cameraFollow(dt, gpos, me.localFrame);
	
	this.tick = tick;
};

Plane.prototype.cameraCut = function() {
	var me = this;
	var lo = me.model.getLocation();
	var la = ge.createLookAt('');
	la.set(lo.getLatitude(), lo.getLongitude(),
		   10 /* altitude */,
		   ge.ALTITUDE_RELATIVE_TO_GROUND,
		   fixAngle(180 + me.model.getOrientation().getHeading() + 45),
		   80, /* tilt */
		   25 /* range */         
		   );
	ge.getView().setAbstractView(la);
};

Plane.prototype.cameraFollow = function(dt, truckPos, localToGlobalFrame) {
	var me = this;
	
	var c0 = Math.exp(-dt / 0.5);
	var c1 = 1 - c0;
	
	var la = ge.getView().copyAsLookAt(ge.ALTITUDE_RELATIVE_TO_GROUND);
	
	var truckHeading = me.model.getOrientation().getHeading();
	var camHeading = la.getHeading();
	
	var deltaHeading = fixAngle(truckHeading - camHeading);
	var heading = camHeading + c1 * deltaHeading;
	heading = fixAngle(heading);
	
	var TRAILING_DISTANCE = 25;
	var headingRadians = heading / 180 * Math.PI;
	
	var CAM_HEIGHT = 10;
	
	var headingDir = V3.rotate(localToGlobalFrame[1], localToGlobalFrame[2],
							   -headingRadians);
	var camPos = V3.add(truckPos, V3.scale(localToGlobalFrame[2], CAM_HEIGHT));
	camPos = V3.add(camPos, V3.scale(headingDir, -TRAILING_DISTANCE));
	var camLla = V3.cartesianToLatLonAlt(camPos);
	var camLat = camLla[0];
	var camLon = camLla[1];
	var camAlt = camLla[2] - ge.getGlobe().getGroundAltitude(camLat, camLon);
	if(camAlt < 0) camAlt = 0;
	la.set(camLat, camLon, camAlt+ 60 +mon_AdjHeight, ge.ALTITUDE_RELATIVE_TO_GROUND,////////////////////////////////////////// 
		   heading, 80 /*tilt*/, 25 /*range*/);
	ge.getView().setAbstractView(la);
};

Plane.prototype.teleportTo = function(lat, lon, heading) {
	var me = this;
	me.model.getLocation().setLatitude(lat);
	me.model.getLocation().setLongitude(lon);
	me.model.getLocation().setAltitude(ge.getGlobe().getGroundAltitude(lat, lon));
	if (heading == null) {
		heading = 0;
	}
	me.vel = [0, 0, 0];
	
	me.localAnchorLla = [lat, lon, 0];
	me.localAnchorCartesian = V3.latLonAltToCartesian(me.localAnchorLla);
	me.localFrame = M33.makeLocalToGlobalFrame(me.localAnchorLla);
	me.modelFrame = M33.identity();
	me.modelFrame[0] = V3.rotate(me.modelFrame[0], me.modelFrame[2], -heading);
	me.modelFrame[1] = V3.rotate(me.modelFrame[1], me.modelFrame[2], -heading);
	me.pos = [0, 0, ge.getGlobe().getGroundAltitude(lat, lon)];
	
	me.cameraCut();
};

Plane.prototype.adjustAnchor = function() {
	// Move our anchor closer to our current position.  Retain our global
	// motion state (position, orientation, velocity).
	var me = this;
	var oldLocalFrame = me.localFrame;
	
	var globalPos = V3.add(me.localAnchorCartesian,
						   M33.transform(oldLocalFrame, me.pos));
	var newAnchorLla = V3.cartesianToLatLonAlt(globalPos);
	newAnchorLla[2] = 0;  // For convenience, anchor always has 0 altitude.
	
	var newAnchorCartesian = V3.latLonAltToCartesian(newAnchorLla);
	var newLocalFrame = M33.makeLocalToGlobalFrame(newAnchorLla);
	
	var oldFrameToNewFrame = M33.transpose(newLocalFrame);
	oldFrameToNewFrame = M33.multiply(oldFrameToNewFrame, oldLocalFrame);
	
	var newVelocity = M33.transform(oldFrameToNewFrame, me.vel);
	var newModelFrame = M33.multiply(oldFrameToNewFrame, me.modelFrame);
	var newPosition = M33.transformByTranspose(
											   newLocalFrame,
											   V3.sub(globalPos, newAnchorCartesian));
	
	me.localAnchorLla = newAnchorLla;
	me.localAnchorCartesian = newAnchorCartesian;
	me.localFrame = newLocalFrame;
	me.modelFrame = newModelFrame;
	me.pos = newPosition;
	me.vel = newVelocity;
}

/*
// TODO: would be nice to have globe.getGroundNormal() in the API.
function estimateGroundNormal(pos, frame) {
	// Take four height samples around the given position, and use it to
	// estimate the ground normal at that position.
	//  (North)
	//     0
	//     *
	//  2* + *3
	//     *
	//     1
	var pos0 = V3.add(pos, frame[0]);
	var pos1 = V3.sub(pos, frame[0]);
	var pos2 = V3.add(pos, frame[1]);
	var pos3 = V3.sub(pos, frame[1]);
	var globe = ge.getGlobe();
	function getAlt(p) {
		var lla = V3.cartesianToLatLonAlt(p);
		return globe.getGroundAltitude(lla[0], lla[1]);
	}
	var dx = getAlt(pos1) - getAlt(pos0);
	var dy = getAlt(pos3) - getAlt(pos2);
	var normal = V3.normalize([dx, dy, 2]);
	
	return normal;
}
*/
