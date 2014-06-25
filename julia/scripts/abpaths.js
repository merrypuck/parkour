// global vars
var walkingManImage = {
    url: 'images/walking_man.png',
		scaledSize: new google.maps.Size(25, 25),
    // The origin for this image is 0,0.
    origin: new google.maps.Point(0,0),
    // The anchor for this image is the base of the flagpole at 0,32.
    anchor: new google.maps.Point(0, 25)
  };


 function getDirections(travelMode, map, request) {
	var directionsService = new google.maps.DirectionsService();
	var pathPolyline = getPathPolyline(travelMode);
	var directionsDisplay;
	if (pathPolyline != null) {
		directionsDisplay = new google.maps.DirectionsRenderer(
			{polylineOptions: pathPolyline,
			 suppressMarkers: true});
	} else {
		directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});
	}
	directionsDisplay.setMap(map);
	
	  directionsService.route(request, function(result, status) {
	    if (status == google.maps.DirectionsStatus.OK) {
	    	handleDirectionsResponse(map, result, directionsDisplay, travelMode);
	    } 
	  });		
}

function handleDirectionsResponse(map, result, directionsDisplay, travelMode) {
  directionsDisplay.setDirections(result);
  console.log(result);
  var route = result.routes[0];
  var routeDurationSecs = getRouteDuration(route);
  var routeDurationMins = Math.round(Math.floor(routeDurationSecs / 60));
	// walking man icon
	if (travelMode == google.maps.TravelMode.WALKING) {
	  var marker = new MarkerWithLabel({
	  	icon: walkingManImage,
	    position: getLatLngAverage(map, route.legs[0].start_location, route.legs[0].end_location, 0.1),
	    	title: 'Walking Distance',
	    	labelContent: routeDurationMins + "m",
				labelClass: "labels",
		   	labelStyle: {opacity: 0.75},
				map: map
	  });
	}
}


// defines how the directions path looks
// default path for driving directions
// dashed path for walking directions
function getPathPolyline(travelMode) {
	if (travelMode == google.maps.TravelMode.WALKING) {
			var lineSymbol = {
			  path: 'M 0,-1 0,1',
			  strokeOpacity: 1,
			  scale: 4
			};      	      	
			// dashed style for directions path
			return new google.maps.Polyline({
			    strokeColor: '#31D647',
			    strokeOpacity: 0,
				  icons: [{
				    icon: lineSymbol,
				    offset: '0',
				    repeat: '20px'
				  }],
	    });      		
	} else {
		return null;
	}
}



// constructs request to DirectionsService for a travel mode (driving?walking?)
// and LatLng
function getWalkingDirections(fromParkingSpot, toDestination) {
	return getDrivingRequest(google.maps.TravelMode.WALKING, fromParkingSpot, toDestination);
}

// request for the DirectionsService to calculate the directions
// between the current user location and the known location of a
// specific parking spot
function getParkourDirections(fromCurrent, toParkingSpot) {
	return getDrivingRequest(google.maps.TravelMode.DRIVING, fromCurrent, toParkingSpot);
}

function getDrivingRequest(travelMode, from, to) {
	return {
		  origin: from,
		  destination: to,
		  travelMode: travelMode,
		  unitSystem: google.maps.UnitSystem.METRIC,
		  durationInTraffic: true,
		  provideRouteAlternatives: true,
		  region: 'IL'
		}      	
}

// Given two points on a map calculate the location that is a 'fraction'
// of the distance along the path between the two points.
function getLatLngAverage(map, latLngFrom, latLngTo, fraction) {
		// Get projected points
    var projection = map.getProjection();
    var pointFrom = projection.fromLatLngToPoint( latLngFrom );
    var pointTo = projection.fromLatLngToPoint( latLngTo );
    // Adjust for lines that cross the 180 meridian
    if( Math.abs( pointTo.x - pointFrom.x ) > 128 ) {
        if( pointTo.x > pointFrom.x )
            pointTo.x -= 256;
        else
            pointTo.x += 256;
    }
    // Calculate point between
    var x = pointFrom.x + ( pointTo.x - pointFrom.x ) * fraction;
    var y = pointFrom.y + ( pointTo.y - pointFrom.y ) * fraction;
    var pointBetween = new google.maps.Point( x, y );
    // Project back to lat/lng
    var latLngBetween = projection.fromPointToLatLng( pointBetween );
    return latLngBetween;      	
}

// For a directions route, returns the time it would take to traverse
// the route in seconds.
function getRouteDuration(route) {
  // For each route, display summary information.
  var routeDuration = 0;
  for (var i = 0; i < route.legs.length; i++) {
  	routeDuration += route.legs[i].duration.value;
  }			      
  console.log("route length: " + routeDuration + " seconds");
  return routeDuration;
}